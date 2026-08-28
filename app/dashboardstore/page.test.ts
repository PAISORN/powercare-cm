import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Store Dashboard", () => {
  it("renders the reference-inspired inventory overview from real Store data", () => {
    const source = readFileSync("app/dashboardstore/page.tsx", "utf8");

    expect(source).toContain("StoreDashboardFilter");
    expect(source).toContain("StoreIssueTrend");
    expect(source).toContain("StoreCategoryDonut");
    expect(source).toContain("สินค้าใกล้หมด Stock");
    expect(source).toContain("ความเคลื่อนไหวล่าสุด");
    expect(source).toContain("ใบเบิกที่ต้องติดตาม");
    expect(source).toContain("สรุปตามคลังสินค้า");
    expect(source).toContain("db.storeStock.findMany");
    expect(source).toContain("db.stockMovement.findMany");
    expect(source).toContain("db.sparePartIssue.findMany");
    expect(source).toContain("currentYearDateFilter");
    expect(source).toContain('return { mode: "year", year }');
    expect(source).not.toContain("Ã Â¸");
  });

  it("keeps financial and navigation details permission-aware", () => {
    const source = readFileSync("app/dashboardstore/page.tsx", "utf8");

    expect(source).toContain("const canViewValue = true");
    expect(source).not.toContain("PermissionKey.VIEW_STORE_DASHBOARD");
    expect(source).not.toContain("PermissionKey.VIEW_STOCK_VALUE");
    expect(source).toContain("PermissionKey.VIEW_STORE_STOCK");
    expect(source).toContain("PermissionKey.VIEW_STORE_TRACKING");
    expect(source).toContain("PermissionKey.RECEIVE_STOCK");
    expect(source).toContain("canViewMovements");
    expect(source).toContain("canViewValue ?");
  });

  it("ships the dedicated filter and responsive chart components", () => {
    expect(existsSync("components/store-dashboard-filter.tsx")).toBe(true);
    expect(existsSync("components/store-dashboard-charts.tsx")).toBe(true);

    const page = readFileSync("app/dashboardstore/page.tsx", "utf8");
    const filter = readFileSync("components/store-dashboard-filter.tsx", "utf8");
    const charts = readFileSync("components/store-dashboard-charts.tsx", "utf8");

    expect(page).toContain('className="dashboard-glass-scope w-full min-w-0 space-y-5 pb-4"');
    expect(page).not.toContain("max-w-[1536px]");
    expect(page).toContain("min-w-0 rounded-3xl");
    expect(page).toContain("overflow-x-auto");
    expect(filter).toContain("CmDateFilterBar");
    expect(filter).toContain('method="get"');
    expect(filter).not.toContain("ประเภท Dashboard");
    expect(charts).toContain('role="img"');
    expect(charts).toContain("จำนวนที่เบิก");
    expect(charts).toContain("store-issue-area");
    expect(charts).toContain('option value="day"');
    expect(charts).toContain('option value="threeMonths"');
    expect(charts).toContain('option value="week"');
    expect(charts).toContain('option value="month"');
    expect(charts).toContain('option value="year"');
    expect(page).toContain("mode === \"year\" ? 52 : dayCount");
    expect(charts).toContain("Array.from({ length: 7 }");
    expect(page).toContain('initialBucket="threeMonths"');
    expect(page).toContain("issue.issuedAt ?? issue.requestedAt");
    expect(page).toContain("countIssuedRecords");
    expect(charts).toContain("จำนวนรายการที่เบิก");
    expect(charts).toContain('stroke="#f97316"');
    expect(charts).toContain("smoothValues");
    expect(charts).toContain("ชี้เพื่อดูค่าจริง");
    expect(charts).toContain("strokeDasharray");
  });
});
