import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function argValue(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`Missing required environment variable: ${name}`);
  return value.trim();
}

const outputRoot = argValue("--output");
const manifestPath = argValue("--manifest");
const bucketsArg = argValue("--buckets");

if (!outputRoot) throw new Error("Missing --output");
if (!manifestPath) throw new Error("Missing --manifest");
if (!bucketsArg) throw new Error("Missing --buckets");

const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/$/, "");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const buckets = bucketsArg
  .split(",")
  .map((bucket) => bucket.trim())
  .filter(Boolean);

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};

function encodeObjectPath(objectPath) {
  return objectPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

async function storageRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Storage request failed ${response.status}: ${detail}`);
  }

  return response;
}

async function listObjects(bucket, prefix = "") {
  const objects = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const response = await storageRequest(`${supabaseUrl}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      body: JSON.stringify({
        prefix,
        limit,
        offset,
        sortBy: { column: "name", order: "asc" },
      }),
    });
    const items = await response.json();
    if (!Array.isArray(items) || items.length === 0) break;

    for (const item of items) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = item.metadata == null;
      if (isFolder) {
        objects.push(...(await listObjects(bucket, fullPath)));
      } else {
        objects.push({
          bucket,
          path: fullPath,
          size: item.metadata?.size ?? null,
          mimetype: item.metadata?.mimetype ?? null,
          updatedAt: item.updated_at ?? null,
        });
      }
    }

    if (items.length < limit) break;
    offset += limit;
  }

  return objects;
}

async function downloadObject(bucket, objectPath) {
  const response = await storageRequest(`${supabaseUrl}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`, {
    method: "GET",
  });
  return Buffer.from(await response.arrayBuffer());
}

const manifest = {
  createdAt: new Date().toISOString(),
  buckets: [],
};

for (const bucket of buckets) {
  console.log(`Backing up storage bucket: ${bucket}`);
  const bucketRoot = path.join(outputRoot, bucket);
  await mkdir(bucketRoot, { recursive: true });

  const objects = await listObjects(bucket);
  for (const object of objects) {
    const targetPath = path.join(bucketRoot, ...object.path.split("/"));
    await mkdir(path.dirname(targetPath), { recursive: true });
    const bytes = await downloadObject(bucket, object.path);
    await writeFile(targetPath, bytes);
  }

  manifest.buckets.push({
    name: bucket,
    objectCount: objects.length,
    objects,
  });
}

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
console.log(`Storage backup manifest: ${manifestPath}`);
