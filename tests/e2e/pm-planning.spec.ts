import { expect, test } from "@playwright/test";
import { db } from "../../lib/db";

function captureBrowserErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(`pageerror: ${error.message}`));
  page.on("console", message => { if (message.type() === "error") errors.push(`console.error: ${message.text()}`); });
  return errors;
}

test.afterAll(async () => { await db.$disconnect(); });

async function login(page: import("@playwright/test").Page, username: string, password = "password1234") {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(password);
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm(?:\/|$)/);
}

test("site admin creates a flexible PM Group and desktop calendar is accessible", async ({ page }, testInfo) => {
  const browserErrors = captureBrowserErrors(page);
  const code = `E2E-${Date.now().toString(36).toUpperCase()}`;
  await login(page, "site-admin");
  await page.goto("/dashboardpm/groups");
  await page.getByText("Create PM Group", { exact: true }).click();
  await page.getByLabel("Code", { exact: true }).first().fill(code);
  await page.getByLabel("Name", { exact: true }).first().fill("Playwright release group");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByRole("status")).toContainText("PM Group saved");
  await expect(page.getByRole("heading", { name: new RegExp(code) })).toBeVisible();

  await page.goto("/dashboardpm");
  const calendar = page.getByRole("region", { name: "ปฏิทินแผน PM แบบรายเดือน" });
  await expect(calendar).toBeVisible();
  await expect(calendar.getByRole("gridcell")).toHaveCount(42);
  await page.getByRole("link", { name: "รายวัน" }).click();
  await expect(page.getByRole("region", { name: "ปฏิทิน PM รายวัน" })).toBeVisible();
  await page.getByRole("link", { name: "ภาพรวมเดือน" }).click();
  await expect(calendar).toBeVisible();
  expect(browserErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("pm-calendar-desktop.png"), fullPage: true, caret: "initial" });
});

test("mobile calendar uses the daily agenda without horizontal overflow", async ({ page }, testInfo) => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "site-admin");
  await page.goto("/dashboardpm?view=day");
  await expect(page.getByRole("region", { name: "ปฏิทิน PM รายวัน" })).toBeVisible();
  await expect(page.getByRole("link", { name: "รายวัน" })).toHaveAttribute("aria-current", "page");
  const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
  expect(width.body).toBeLessThanOrEqual(width.viewport);
  expect(browserErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("pm-calendar-mobile.png"), fullPage: true, caret: "initial" });
});

test("CSV export is authenticated, scoped, and UTF-8 BOM encoded", async ({ page }) => {
  const denied = await page.request.get("/dashboardpm/export");
  expect([302, 303, 307, 401, 403]).toContain(denied.status());
  await login(page, "site-admin");
  const siteAdmin = await db.user.findUniqueOrThrow({ where: { username: "site-admin" } });
  const outsideOrg = await db.organization.create({ data: { slug: `e2e-out-${Date.now()}`, name: "E2E Out of Scope" } });
  const otherPlant = await db.plant.create({ data: { organizationId: outsideOrg.id, code: `OUT${Date.now()}`, name: "Out of Scope Site" } });
  const insideClass = await db.assetClass.upsert({ where: { plantId_nameTh: { plantId: siteAdmin.plantId!, nameTh: "เครื่องจักร CSV E2E" } }, update: {}, create: { plantId: siteAdmin.plantId!, nameTh: "เครื่องจักร CSV E2E" } });
  const insideFamily = await db.assetFamily.upsert({ where: { plantId_code: { plantId: siteAdmin.plantId!, code: "CSV" } }, update: {}, create: { plantId: siteAdmin.plantId!, code: "CSV", nameTh: "กลุ่ม CSV E2E" } });
  const insideAsset = await db.asset.create({ data: { plantId: siteAdmin.plantId!, assetClassId: insideClass.id, familyId: insideFamily.id, code: `CSV-ASSET-${Date.now()}`, nameTh: "Asset ในขอบเขต" } });
  const outsideClass = await db.assetClass.create({ data: { plantId: otherPlant.id, nameTh: "เครื่องจักรนอกขอบเขต" } });
  const outsideFamily = await db.assetFamily.create({ data: { plantId: otherPlant.id, code: "OUT", nameTh: "กลุ่มนอกขอบเขต" } });
  const outsideAsset = await db.asset.create({ data: { plantId: otherPlant.id, assetClassId: outsideClass.id, familyId: outsideFamily.id, code: `OUT-ASSET-${Date.now()}`, nameTh: "Asset นอกขอบเขต" } });
  const inside = `PM-E2E-IN-${Date.now()}`;
  const outside = `PM-E2E-OUT-${Date.now()}`;
  const insidePlan = await db.pmPlan.create({ data: { organizationId: siteAdmin.organizationId!, plantId: siteAdmin.plantId!, plannedDateKey: "2036-01-01", status: "CONFIRMED" } });
  const outsidePlan = await db.pmPlan.create({ data: { organizationId: otherPlant.organizationId, plantId: otherPlant.id, plannedDateKey: "2036-01-01", status: "CONFIRMED" } });
  await db.pmWork.create({ data: { number: inside, plantId: siteAdmin.plantId!, pmPlanId: insidePlan.id, assetId: insideAsset.id, assetNameSnapshot: insideAsset.nameTh, status: "PLANNED" } });
  await db.pmWork.create({ data: { number: outside, plantId: otherPlant.id, pmPlanId: outsidePlan.id, assetId: outsideAsset.id, assetNameSnapshot: outsideAsset.nameTh, status: "PLANNED" } });
  await page.goto("/dashboardpm/work");
  const exportHref = await page.getByRole("link", { name: "Export CSV" }).getAttribute("href");
  expect(exportHref).toBeTruthy();
  const response = await page.request.get(exportHref!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  const bytes = await response.body();
  expect(Array.from(bytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  expect(bytes.toString("utf8")).toContain("เลขที่ PM");
  expect(bytes.toString("utf8")).toContain(inside);
  expect(bytes.toString("utf8")).not.toContain(outside);
});
