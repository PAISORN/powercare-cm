import { loadProjectEnv } from "./load-project-env.js";

loadProjectEnv();

function extractHost(connectionString?: string) {
  if (!connectionString) return null;

  try {
    return new URL(connectionString).host;
  } catch {
    return null;
  }
}

function extractProjectRef(value?: string | null) {
  if (!value) return null;

  const supabaseUrlMatch = value.match(/https:\/\/([a-z0-9]{20})\.supabase\.co/i);
  if (supabaseUrlMatch) return supabaseUrlMatch[1];

  const databaseHostMatch = value.match(/(?:db|aws-[^.]+)\.([a-z0-9]{20})\.supabase\.co/i);
  if (databaseHostMatch) return databaseHostMatch[1];

  return null;
}

const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;
const supabaseUrl = process.env.SUPABASE_URL;

const summary = {
  databaseHost: extractHost(databaseUrl),
  databaseProjectRef: extractProjectRef(extractHost(databaseUrl)),
  directHost: extractHost(directUrl),
  directProjectRef: extractProjectRef(extractHost(directUrl)),
  supabaseUrl,
  supabaseProjectRef: extractProjectRef(supabaseUrl),
  fileStorageDriver: process.env.FILE_STORAGE_DRIVER ?? null,
  productionProjectRef: process.env.PRODUCTION_SUPABASE_PROJECT_REF ?? null,
};

console.log(JSON.stringify(summary, null, 2));
