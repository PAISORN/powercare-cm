import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store report export route", () => {
  it("supports scoped Excel and printable PDF exports", () => {
    expect(existsSync("app/dashboardstore/reports/export/route.ts")).toBe(true);
    const source = readFileSync("app/dashboardstore/reports/export/route.ts", "utf8");

    expect(source).toContain("VIEW_STORE_REPORTS");
    expect(source).toContain("resolveStorePageScope");
    expect(source).toContain("STOCK_BALANCE");
    expect(source).toContain("LOW_STOCK");
    expect(source).toContain("MOVEMENTS");
    expect(source).toContain("ISSUES");
    expect(source).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(source).toContain("พิมพ์ / บันทึกเป็น PDF");
  });
});
