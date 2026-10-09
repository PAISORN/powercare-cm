import { expect, test } from "@playwright/test";
import { db } from "../../lib/db";

let visualAssetId = "";
let fixture: { assetId: string; fieldId: string; typeId: string; classId: string; systemId: string } | null = null;

function captureBrowserErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm(?:\/|$)/);
}

test.beforeAll(async () => {
  if (/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("PM Check Sheet visual QA must use a disposable or local SQLite database");
  }
  const plant = await db.plant.findFirst({ where: { active: true }, orderBy: { code: "asc" }, select: { id: true } });
  if (!plant) throw new Error("No active Site was found for PM Check Sheet visual QA");
  const suffix = `${process.pid}-${Date.now()}`;
  const created = await db.$transaction(async (tx) => {
    const assetClass = await tx.assetClass.create({ data: { plantId: plant.id, nameTh: `Visual QA Class ${suffix}` } });
    const assetType = await tx.assetType.create({ data: { plantId: plant.id, assetClassId: assetClass.id, code: `VQA${process.pid}`, nameTh: "Visual QA Type" } });
    const system = await tx.assetSystem.create({ data: { plantId: plant.id, code: `VQA-${process.pid}`, nameTh: "Visual QA System" } });
    const field = await tx.assetTechnicalField.create({ data: { assetTypeId: assetType.id, key: "visual_check", labelTh: "ตรวจสภาพสำหรับ Visual QA", dataType: "SELECT", optionsJson: JSON.stringify(["ปกติ", "ผิดปกติ"]), required: true } });
    const asset = await tx.asset.create({ data: { plantId: plant.id, systemId: system.id, assetClassId: assetClass.id, assetTypeId: assetType.id, code: `VQA-ASSET-${suffix}`, nameTh: "เครื่องจักร Visual QA", migrationStatus: "READY" } });
    return { assetId: asset.id, fieldId: field.id, typeId: assetType.id, classId: assetClass.id, systemId: system.id };
  });
  fixture = created;
  visualAssetId = created.assetId;
});

test.afterAll(async () => {
  if (fixture) {
    await db.$transaction(async (tx) => {
      await tx.pmCheckSheetItem.deleteMany({ where: { assetId: fixture!.assetId } });
      await tx.asset.delete({ where: { id: fixture!.assetId } });
      await tx.assetTechnicalField.delete({ where: { id: fixture!.fieldId } });
      await tx.assetType.delete({ where: { id: fixture!.typeId } });
      await tx.assetClass.delete({ where: { id: fixture!.classId } });
      await tx.assetSystem.delete({ where: { id: fixture!.systemId } });
    });
  }
  await db.$disconnect();
});

test("desktop PM Check Sheet renders Default rows and Custom drawer", async ({ page }, testInfo) => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const assetId = visualAssetId;
  await page.goto(`/dashboardpm/check-sheets?assetId=${assetId}`);

  await expect(page.getByRole("main", { name: "PM Check Sheet Setup" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PM Check Sheet" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Assets Tree สำหรับ PM Check Sheet" })).toBeVisible();
  await expect(page.getByText("Default", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("แก้ไขที่ Template", { exact: true }).first()).toBeVisible();

  const addHref = await page.getByRole("link", { name: "Add Checklist" }).getAttribute("href");
  expect(addHref).toContain("new=1");
  await Promise.all([
    page.waitForURL(/(?:\?|&)new=1(?:&|$)/, { timeout: 30_000 }),
    page.getByRole("link", { name: "Add Checklist" }).click(),
  ]);
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: "เพิ่ม Custom Checklist" })).toBeVisible();
  await expect(drawer.getByLabel("ชื่อหัวข้อ")).toBeVisible();
  await expect(drawer.getByLabel("ชนิดข้อมูล")).toBeVisible();
  await expect(drawer.getByLabel("บังคับกรอก")).toBeVisible();
  await expect(drawer.getByRole("button", { name: "บันทึก Checklist" })).toBeVisible();
  const customLabel = `Visual QA ${Date.now()}`;
  await drawer.getByLabel("ชื่อหัวข้อ").fill(customLabel);
  await Promise.all([
    page.waitForURL(/(?:\?|&)saved=created(?:&|$)/, { timeout: 30_000 }),
    drawer.getByRole("button", { name: "บันทึก Checklist" }).click(),
  ]);
  await expect(page.getByText(customLabel, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: `แก้ไข ${customLabel}` }).click();
  const editDrawer = page.getByRole("dialog");
  const editedLabel = `${customLabel} edited`;
  await editDrawer.getByLabel("ชื่อหัวข้อ").fill(editedLabel);
  await Promise.all([
    page.waitForURL(/(?:\?|&)saved=updated(?:&|$)/, { timeout: 30_000 }),
    editDrawer.getByRole("button", { name: "บันทึก Checklist" }).click(),
  ]);
  await expect(page.getByText(editedLabel, { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await Promise.all([
    page.waitForURL(/(?:\?|&)deleted=1(?:&|$)/, { timeout: 30_000 }),
    page.getByRole("button", { name: `ลบ ${editedLabel}` }).click(),
  ]);
  await expect(page.getByText(editedLabel, { exact: true })).toHaveCount(0);
  expect(browserErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("pm-check-sheet-desktop.png"), fullPage: true, caret: "initial" });
});

test("mobile PM Check Sheet stays within viewport and opens the Custom drawer", async ({ page }, testInfo) => {
  const browserErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const assetId = visualAssetId;
  await page.goto(`/dashboardpm/check-sheets?assetId=${assetId}`);

  await expect(page.getByRole("main", { name: "PM Check Sheet Setup" })).toBeVisible();
  await expect(page.getByText("Default", { exact: true }).first()).toBeVisible();
  const widthBefore = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
  expect(widthBefore.body).toBeLessThanOrEqual(widthBefore.viewport);

  const addHref = await page.getByRole("link", { name: "Add Checklist" }).getAttribute("href");
  expect(addHref).toContain("new=1");
  await Promise.all([
    page.waitForURL(/(?:\?|&)new=1(?:&|$)/, { timeout: 30_000 }),
    page.getByRole("link", { name: "Add Checklist" }).click(),
  ]);
  await expect(page.getByRole("dialog")).toBeVisible();
  const widthAfter = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
  expect(widthAfter.body).toBeLessThanOrEqual(widthAfter.viewport);
  expect(browserErrors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("pm-check-sheet-mobile.png"), fullPage: true, caret: "initial" });
});
