import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 15_000 },
  testDir: "./tests/e2e",
  fullyParallel: false,
  // E2E workflows intentionally share one disposable SQLite fixture. Running files
  // concurrently makes user/CM lifecycle mutations race and invalidates the evidence.
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3200",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
