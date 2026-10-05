import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function expectMarkersInOrder(path: string, markers: string[]) {
  const pageSource = source(path);
  let previousIndex = -1;

  for (const marker of markers) {
    const markerIndex = pageSource.indexOf(marker);
    expect(markerIndex, `${path} is missing ${marker}`).toBeGreaterThanOrEqual(0);
    expect(
      markerIndex,
      `${marker} in ${path} must render after ${markers[markers.indexOf(marker) - 1]}`,
    ).toBeGreaterThan(previousIndex);
    previousIndex = markerIndex;
  }
}

describe("shared page hierarchy", () => {
  it.each([
    [
      "app/dashboardcm/page.tsx",
      ["<AdminSiteScopeSelector", "dashboard-cm-heading", 'aria-label="สรุป KPI Dashboard CM"'],
    ],
    [
      "app/dashboardstore/page.tsx",
      ["<AdminSiteScopeSelector", '<header className="menu-heading-plain', 'aria-label="สรุปข้อมูลคลังสินค้า"'],
    ],
    [
      "components/asset-registry-page.tsx",
      ["<AdminSiteScopeSelector", '<header className="flex', 'aria-label="Asset KPI strip"'],
    ],
    [
      "components/activities-page/activities-workspace.tsx",
      ["<AdminSiteScopeSelector", '<header className="menu-heading-plain', 'aria-label="สรุป My Activities"'],
    ],
    [
      "app/members/page.tsx",
      ["<AdminSiteScopeSelector", "Maintenance Members", 'aria-label="สรุปสมาชิกทีมซ่อมบำรุง"'],
    ],
    [
      "app/dashboardstore/reports/page.tsx",
      ["<AdminSiteScopeSelector", "Store Reports", 'aria-label="สรุปรายงาน Store"'],
    ],
  ])("renders scope, page header, then KPI for %s", (path, markers) => {
    expectMarkersInOrder(path, markers);
  });

  it.each([
    ["app/assets/master-data/page.tsx", "Asset Master Data"],
    ["app/assets/qr-settings/page.tsx", "QR Public Profile"],
    ["app/dashboardstore/tracking/page.tsx", "Issue Tracking"],
    ["app/dashboardstore/public-issue/page.tsx", "Issue Public"],
    ["app/dashboardstore/movements/page.tsx", "Stock Movement ล่าสุด"],
    ["app/dashboardstore/receive/page.tsx", "Receive Stock"],
    ["app/admin/categories/page.tsx", ">Categories</h1>"],
    ["app/admin/zones/page.tsx", ">Zones</h1>"],
    ["app/admin/sla/page.tsx", "SLA Settings"],
    ["app/admin/settings/page.tsx", "System Settings"],
    ["app/admin/qr-code/page.tsx", "QR Code แจ้งซ่อมราย Site"],
    ["app/admin/line/page.tsx", "LINE Settings"],
  ])("renders scope before the page header for %s", (path, headerMarker) => {
    expectMarkersInOrder(path, ["<AdminSiteScopeSelector", headerMarker]);
  });
});
