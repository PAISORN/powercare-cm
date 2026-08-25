import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "../../../../modules/cron/cron-authorization";
import { runDailyCoordinator } from "./route";

describe("daily cron coordinator", () => {
  it("rejects an unauthorized coordinator request before either job runs", async () => {
    const { GET } = await import("./route");
    const previousSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "expected";
    try {
      const response = await GET(new Request("https://example.test/api/cron/daily"));
      expect(response.status).toBe(401);
    } finally {
      if (previousSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousSecret;
    }
  });
  it("requires CRON_SECRET in production and accepts its bearer token", () => {
    const request = new Request("https://example.test/api/cron/daily", { headers: { authorization: "Bearer secret" } });
    expect(isAuthorizedCronRequest(request, { NODE_ENV: "production", CRON_SECRET: "secret" })).toBe(true);
    expect(isAuthorizedCronRequest(new Request(request.url), { NODE_ENV: "production", CRON_SECRET: "secret" })).toBe(false);
    expect(isAuthorizedCronRequest(new Request(request.url), { NODE_ENV: "production" })).toBe(false);
  });

  it("runs LINE and PM jobs and reports both results", async () => {
    const result = await runDailyCoordinator([
      { name: "lineDailyReport", run: async () => ({ sent: 1 }) },
      { name: "pmDueOverdue", run: async () => ({ created: 2 }) },
    ]);
    expect(result).toEqual({ ok: true, results: [
      { name: "lineDailyReport", ok: true, result: { sent: 1 } },
      { name: "pmDueOverdue", ok: true, result: { created: 2 } },
    ] });
  });

  it("lets the other idempotent job finish and returns a failed coordinator result", async () => {
    let pmRan = false;
    const result = await runDailyCoordinator([
      { name: "lineDailyReport", run: async () => { throw new Error("LINE failed"); } },
      { name: "pmDueOverdue", run: async () => { pmRan = true; return { created: 1 }; } },
    ]);
    expect(pmRan).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.results[0]).toEqual({ name: "lineDailyReport", ok: false, error: "LINE failed" });
  });
});
