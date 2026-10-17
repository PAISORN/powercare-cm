import { expect, test, type Page } from "@playwright/test";
import { db } from "../../lib/db";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error")
      errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("site-admin");
  await page.getByPlaceholder("Password").fill("password1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboardcm(?:\/|$)/);
}

function bangkokYear() {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    }).format(new Date()),
  );
}

function weekCard(page: Page, weekNumber: number) {
  return page.getByRole("region", { name: `Pattern Week ${weekNumber}`, exact: true });
}

test.afterAll(async () => {
  await db.$disconnect();
});

test("creates, generates, and previews an Annual PM Monthly Pattern", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const browserErrors = captureBrowserErrors(page);
  const year = bangkokYear() + 1;
  const planName = `Monthly Pattern E2E ${Date.now()}`;

  await login(page);
  await page.goto(`/dashboardpm/setup?year=${year}`);
  await expect(
    page.getByRole("heading", { name: "Annual PM Setup" }),
  ).toBeVisible();

  await page.locator('input[name="name"]').fill(planName);
  await page.locator('select[name="pmBy"]').selectOption("ZONE");
  await page
    .locator('select[name="scheduleMode"]')
    .selectOption("MONTHLY_PATTERN");
  await page.getByRole("button", { name: "สร้าง Draft" }).click();

  await expect(page.getByRole("heading", { name: planName, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ตั้งค่าแผน", exact: true }).click();
  await expect(page.getByLabel("Schedule Mode")).toHaveValue(
    "MONTHLY_PATTERN",
  );
  await page.getByRole("button", { name: "Pattern ต้นแบบ", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Pattern ต้นแบบ",
    }),
  ).toBeVisible();
  await expect(page.getByText("Regeneration Required")).toBeVisible();

  const weekOne = weekCard(page, 1);
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.screenshot({ path: testInfo.outputPath("setup-workspace-desktop.png"), caret: "initial" });
  await weekOne.getByRole("button", { name: "เพิ่ม PM ใน Week 1", exact: true }).click();
  await weekOne.getByLabel("วันเพิ่ม PM Week 1").selectOption("3");
  const targetOptions = weekOne.getByRole("group", {
    name: "เลือก PM Pattern Week 1",
  });
  const firstTarget = targetOptions.getByRole("checkbox").first();
  await expect(firstTarget).toBeVisible();
  const selectedTarget = await firstTarget.locator("xpath=..").textContent();
  await firstTarget.check();
  await weekOne.getByRole("button", { name: "เพิ่ม 1 รายการใน Week 1" }).click();
  await page.getByRole("button", { name: "ปฏิทินและรายเดือน", exact: true }).click();
  await expect(page.locator("[data-pm-monthly-pattern]")).toBeHidden();
  await page.getByRole("button", { name: "Pattern ต้นแบบ", exact: true }).click();
  await expect(
    weekOne.getByRole("article").getByText((selectedTarget ?? "").trim()),
  ).toHaveCount(1);

  for (const weekNumber of [2, 3, 4]) {
    const card = weekCard(page, weekNumber);
    await card.getByRole("button", { name: "No PM" }).click();
    await expect(
      card.getByText(`ระบบจะไม่สร้าง PM สำหรับ Week ${weekNumber}`),
    ).toBeVisible();
  }

  await page.getByText("เพิ่มหลายรายการพร้อมกัน · ตัวเลือกขั้นสูง", { exact: true }).click();
  await page
    .getByLabel("กรณีเดือนมี Week 5")
    .selectOption("REPEAT_WEEK_1");
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.locator("[data-pm-pattern-week-grid]").screenshot({
    path: testInfo.outputPath("pattern-week-inline-desktop.png"), caret: "initial",
  });
  await page.locator("[data-pm-monthly-pattern]").screenshot({
    path: testInfo.outputPath("monthly-pattern-builder-desktop.png"),
    caret: "initial",
  });
  await page.getByRole("button", { name: "Save Monthly Pattern" }).click();
  await expect(page).toHaveURL(/saved=monthly-pattern(?:&|$)/);
  await expect(page.getByRole("status")).toContainText(
    "บันทึก Annual PM Setup แล้ว",
  );
  await expect(page.getByText("Regeneration Required")).toBeVisible();
  const savedPlanId = new URL(page.url()).searchParams.get("planId")!;
  const savedPatterns = await db.pmAnnualMonthlyPattern.findMany({ where: { planId: savedPlanId } });
  expect(savedPatterns).toHaveLength(1);
  expect(savedPatterns[0]).toMatchObject({ weekNumber: 1, dayOfWeek: 3 });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".app-workspace")).toHaveCSS("margin-left", "0px");
  await page.reload();
  await expect(page.locator("[data-pm-monthly-pattern]")).toBeVisible();
  await weekOne.getByRole("button", { name: "เพิ่ม PM ใน Week 1", exact: true }).click();
  await weekOne.screenshot({ path: testInfo.outputPath("pattern-week-inline-mobile.png"), caret: "initial" });
  const builderWidth = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(builderWidth.body).toBeLessThanOrEqual(builderWidth.viewport);
  await page.locator("[data-pm-monthly-pattern]").screenshot({
    path: testInfo.outputPath("monthly-pattern-builder-mobile.png"),
    caret: "initial",
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();

  await page.getByLabel("Effective Start Date").fill(`${year}-01-01`);
  await page.getByRole("button", { name: "Preview Annual Plan" }).click();
  await expect(page.getByText("Diff Preview")).toBeVisible();
  await expect(page.getByText(/เพิ่ม [1-9]\d* .* รวม [1-9]\d*/)).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Confirm Generate" }).click();
  await expect(page.getByRole("status")).toContainText(
    "บันทึก Annual PM Setup แล้ว",
  );
  await expect(page.getByText("In Sync", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.locator("#pm-setup-workspace").screenshot({ path: testInfo.outputPath("setup-pattern-final-desktop.png"), caret: "initial" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".app-workspace")).toHaveCSS("margin-left", "0px");
  await page.getByRole("group", { name: "งาน Annual PM Setup", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "ตั้งค่าแผน", exact: true })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("setup-pattern-final-mobile.png"), fullPage: true, caret: "initial" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth ? [] : Array.from(document.querySelectorAll("body *")).filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.right > window.innerWidth + 1 && getComputedStyle(element).position !== "fixed";
  }).map(element => `${element.tagName}.${element.className}: ${Math.round(element.getBoundingClientRect().right)}`))).toEqual([]);
  await page.setViewportSize({ width: 1600, height: 1000 });

  await page.getByRole("button", { name: "ปฏิทินและรายเดือน", exact: true }).click();
  await page.getByRole("link", { name: "Year", exact: true }).click();
  const january = page.getByRole("link", { name: /January/ });
  await expect(january).toContainText("Pattern");
  await expect(january).toContainText("Custom 0");
  await expect(january).toContainText("Override 0");
  await page.screenshot({
    path: testInfo.outputPath("monthly-pattern-year-desktop.png"),
    fullPage: true,
    caret: "initial",
  });

  await january.click();
  await expect(page.getByText(`January ${year}`, { exact: true })).toBeVisible();
  await expect(page.locator('[data-pm-setup-day-card]').getByText((selectedTarget ?? "").trim()).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".app-workspace")).toHaveCSS("margin-left", "0px");
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "รายการราย Week · January " + year,
    }),
  ).toBeVisible();
  const width = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.body).toBeLessThanOrEqual(width.viewport);
  await page.screenshot({
    path: testInfo.outputPath("monthly-pattern-mobile.png"),
    fullPage: true,
    caret: "initial",
  });

  expect(browserErrors).toEqual([]);
});
