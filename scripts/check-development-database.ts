import { pathToFileURL } from "node:url";
import { loadProjectEnv } from "./load-project-env.js";

export function assertDevelopmentDatabase(input: { databaseUrl?: string; productionProjectRef?: string }) {
  if (!input.databaseUrl) throw new Error("DATABASE_URL is required");
  if (!input.productionProjectRef) throw new Error("PRODUCTION_SUPABASE_PROJECT_REF is required");

  if (input.databaseUrl.toLowerCase().includes(input.productionProjectRef.toLowerCase())) {
    throw new Error("Development database points to production Supabase");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadProjectEnv();

  assertDevelopmentDatabase({
    databaseUrl: process.env.DATABASE_URL,
    productionProjectRef: process.env.PRODUCTION_SUPABASE_PROJECT_REF,
  });
  console.log("Development database safety check passed");
}
