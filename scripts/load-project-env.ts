import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

let envLoaded = false;

export function loadProjectEnv() {
  if (envLoaded) return;

  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
  envLoaded = true;
}
