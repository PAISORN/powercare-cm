param(
  [string]$EnvFile = ".env.local",
  [string]$OutputRoot = "backups",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Read-DotEnv {
  param([string]$Path)

  if (!(Test-Path -LiteralPath $Path)) {
    throw "Environment file not found: $Path"
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (!$line -or $line.StartsWith("#")) { return }
    if ($line -notmatch "^\s*([^=]+?)\s*=\s*(.*)\s*$") { return }

    $name = $matches[1].Trim()
    $value = $matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

function Require-Env {
  param([string]$Name)
  $value = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $Name"
  }
  return $value
}

function Find-CommandPath {
  param(
    [string]$CommandName,
    [string[]]$FallbackPaths
  )

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  foreach ($fallbackPath in $FallbackPaths) {
    if (Test-Path -LiteralPath $fallbackPath) { return $fallbackPath }
  }

  return $null
}

function Invoke-StorageApi {
  param(
    [string]$Method,
    [string]$Url,
    [object]$Body = $null,
    [string]$OutFile = $null
  )

  $headers = @{
    apikey = $script:ServiceKey
    Authorization = "Bearer $script:ServiceKey"
  }

  if ($OutFile) {
    Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -OutFile $OutFile | Out-Null
    return $null
  }

  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers -ContentType "application/json" -Body $json
  }

  return Invoke-RestMethod -Method $Method -Uri $Url -Headers $headers
}

function Get-StorageObjects {
  param(
    [string]$Bucket,
    [string]$Prefix = ""
  )

  $objects = @()
  $offset = 0
  $limit = 1000

  while ($true) {
    $listUrl = "$script:SupabaseUrl/storage/v1/object/list/$Bucket"
    $body = @{
      prefix = $Prefix
      limit = $limit
      offset = $offset
      sortBy = @{
        column = "name"
        order = "asc"
      }
    }

    $items = Invoke-StorageApi -Method "POST" -Url $listUrl -Body $body
    if (!$items -or $items.Count -eq 0) { break }

    foreach ($item in $items) {
      $itemPath = if ($Prefix) { "$Prefix/$($item.name)" } else { "$($item.name)" }
      if ($null -eq $item.metadata) {
        $objects += Get-StorageObjects -Bucket $Bucket -Prefix $itemPath
      } else {
        $objects += [pscustomobject]@{
          bucket = $Bucket
          path = $itemPath
          size = $item.metadata.size
          mimetype = $item.metadata.mimetype
          updatedAt = $item.updated_at
        }
      }
    }

    if ($items.Count -lt $limit) { break }
    $offset += $limit
  }

  return $objects
}

function Backup-StorageBucket {
  param(
    [string]$Bucket,
    [string]$DestinationRoot
  )

  Write-Host "Backing up storage bucket: $Bucket"
  $bucketRoot = Join-Path $DestinationRoot $Bucket
  New-Item -ItemType Directory -Force -Path $bucketRoot | Out-Null

  $objects = Get-StorageObjects -Bucket $Bucket
  $manifestObjects = @()

  foreach ($object in $objects) {
    $relativePath = $object.path.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
    $targetPath = Join-Path $bucketRoot $relativePath
    $targetDir = Split-Path -Parent $targetPath
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

    $encodedPath = ($object.path -split "/" | ForEach-Object { [uri]::EscapeDataString($_) }) -join "/"
    $downloadUrl = "$script:SupabaseUrl/storage/v1/object/$Bucket/$encodedPath"
    Invoke-StorageApi -Method "GET" -Url $downloadUrl -OutFile $targetPath

    $manifestObjects += $object
  }

  return $manifestObjects
}

Read-DotEnv -Path $EnvFile

$script:SupabaseUrl = (Require-Env "SUPABASE_URL").TrimEnd("/")
$script:ServiceKey = Require-Env "SUPABASE_SERVICE_ROLE_KEY"
$databaseUrl = [Environment]::GetEnvironmentVariable("DIRECT_URL", "Process")
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
  $databaseUrl = Require-Env "DATABASE_URL"
}

$profileBucket = [Environment]::GetEnvironmentVariable("SUPABASE_PROFILE_PHOTOS_BUCKET", "Process")
if ([string]::IsNullOrWhiteSpace($profileBucket)) { $profileBucket = "powercare-profile-photos" }

$signatureBucket = [Environment]::GetEnvironmentVariable("SUPABASE_SIGNATURES_BUCKET", "Process")
if ([string]::IsNullOrWhiteSpace($signatureBucket)) { $signatureBucket = "powercare-signatures" }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $OutputRoot $timestamp
$databaseRoot = Join-Path $backupRoot "database"
$storageRoot = Join-Path $backupRoot "storage"

if ($DryRun) {
  Write-Host "Dry run OK"
  Write-Host "Supabase URL: $script:SupabaseUrl"
  Write-Host "Profile bucket: $profileBucket"
  Write-Host "Signature bucket: $signatureBucket"
  Write-Host "Output: $backupRoot"
  exit 0
}

New-Item -ItemType Directory -Force -Path $databaseRoot, $storageRoot | Out-Null

$manifest = [ordered]@{
  createdAt = (Get-Date).ToString("o")
  supabaseUrl = $script:SupabaseUrl
  database = [ordered]@{
    dumpFile = $null
    schemaFile = $null
    tableCountsFile = $null
    fullDumpCreated = $false
  }
  storage = [ordered]@{
    buckets = @()
  }
}

$pgDump = Find-CommandPath "pg_dump" @(
  "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
  "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
  "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
  "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
  "C:\Program Files\PostgreSQL\18\pgAdmin 4\runtime\pg_dump.exe",
  "C:\Program Files\PostgreSQL\17\pgAdmin 4\runtime\pg_dump.exe"
)
if ($pgDump) {
  $dumpFile = Join-Path $databaseRoot "powercare-public.dump"
  Write-Host "Backing up database with pg_dump..."
  & $pgDump "--dbname=$databaseUrl" "--schema=public" "--format=custom" "--no-owner" "--no-privileges" "--file=$dumpFile"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
  $manifest.database.dumpFile = "database/powercare-public.dump"
  $manifest.database.fullDumpCreated = $true
} else {
  Write-Warning "pg_dump was not found. Database dump was skipped."
}

$schemaFile = Join-Path $databaseRoot "schema.sql"
Write-Host "Saving current Prisma Supabase schema..."
Copy-Item -LiteralPath "prisma/schema.supabase.prisma" -Destination $schemaFile -Force
$manifest.database.schemaFile = "database/schema.sql"

$countsFile = Join-Path $databaseRoot "table-counts.json"
Write-Host "Saving table count snapshot..."
$env:DATABASE_URL = $databaseUrl
$env:DIRECT_URL = $databaseUrl
@'
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const tables = [
  ["Category", () => db.category.count()],
  ["Zone", () => db.zone.count()],
  ["User", () => db.user.count()],
  ["CmWork", () => db.cmWork.count()],
  ["StatusHistory", () => db.statusHistory.count()],
  ["AuditEvent", () => db.auditEvent.count()],
  ["Signature", () => db.signature.count()],
  ["ProfilePhoto", () => db.profilePhoto.count()],
  ["SlaSetting", () => db.slaSetting.count()],
  ["CmNumberSequence", () => db.cmNumberSequence.count()],
];
Promise.all(tables.map(async ([name, fn]) => ({ table: name, count: await fn() })))
  .then((rows) => process.stdout.write(JSON.stringify(rows, null, 2)))
  .finally(() => db.$disconnect());
'@ | node - | Set-Content -LiteralPath $countsFile -Encoding UTF8
$manifest.database.tableCountsFile = "database/table-counts.json"

foreach ($bucket in @($profileBucket, $signatureBucket)) {
  Write-Host "Queueing storage bucket: $bucket"
}

$storageManifestFile = Join-Path $backupRoot "storage-manifest.json"
& node "scripts/backup-supabase-storage.mjs" "--output" $storageRoot "--manifest" $storageManifestFile "--buckets" "$profileBucket,$signatureBucket"
if ($LASTEXITCODE -ne 0) { throw "Storage backup failed with exit code $LASTEXITCODE" }
$storageManifest = Get-Content -LiteralPath $storageManifestFile -Raw | ConvertFrom-Json
$manifest.storage.buckets = $storageManifest.buckets

$manifestPath = Join-Path $backupRoot "manifest.json"
$manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

Write-Host ""
Write-Host "Backup complete: $backupRoot"
Write-Host "Manifest: $manifestPath"
