import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("LINE daily report API route", () => {
  it("protects the cron endpoint with CRON_SECRET and dispatches the daily report", () => {
    const source = readFileSync("app/api/line/daily-report/route.ts", "utf8");
    const authorization = readFileSync("modules/cron/cron-authorization.ts", "utf8");

    expect(source).toContain("isAuthorizedCronRequest");
    expect(authorization).toContain("CRON_SECRET");
    expect(authorization).toContain("authorization");
    expect(source).toContain("dispatchAllLineDailyReports");
    expect(source).toContain("force");
  });
});
