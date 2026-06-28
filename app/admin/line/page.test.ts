import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/admin/line/page.tsx", "utf8");

describe("admin LINE settings page", () => {
  it("offers an immediate LINE daily report test action", () => {
    expect(source).toContain("sendDailyReportNowAction");
    expect(source).toContain("dispatchLineDailyReport");
    expect(source).toContain("force: true");
    expect(source).toContain("eventIdSuffix");
    expect(source).toContain("ส่งรายงาน LINE ทดสอบตอนนี้");
    expect(source).toContain("dailyReportTested");
    expect(source).toContain("dailyReportSkipped");
  });
});
