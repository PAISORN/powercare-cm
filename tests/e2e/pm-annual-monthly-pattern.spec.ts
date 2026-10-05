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
  await page.locator("form button").click();
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
  return page
    .locator("section")
    .filter({ has: page.getByText(`Week ${weekNumber}`, { exact: true }) })
    .last();
}

test.afterAll(async () => {
  await db.$disconnect();
});

test("creates, generates, and previews an Annual PM Monthly Pattern", async ({
  page,
}, testInfo) => {
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

  await expect(page.getByText(`${planName} · DRAFT`)).toBeVisible();
  await expect(page.getByLabel("Schedule Mode")).toHaveValue(
    "MONTHLY_PATTERN",
  );
  await expect(
    page.getByRole("heading", {
      name: "Annual PM Plan – Monthly Pattern",
    }),
  ).toBeVisible();
  await expect(page.getByText("Regeneration Required")).toBeVisible();

  const targetOptions = page.getByRole("group", {
    name: "Zone / Area options",
  });
  const firstTarget = targetOptions.getByRole("checkbox").first();
  await expect(firstTarget).toBeVisible();
  const selectedTarget = await firstTarget.locator("xpath=..").textContent();
  await firstTarget.check();
  await page.getByRole("button", { name: "เพิ่ม 1 รายการไป Week 1" }).click();
  const weekOne = weekCard(page, 1);
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

  await page
    .locator('select[name="monthlyWeek5Rule"]')
    .selectOption("REPEAT_WEEK_1");
  await page.locator("[data-pm-monthly-pattern]").screenshot({
    path: testInfo.outputPath("monthly-pattern-builder-desktop.png"),
    caret: "initial",
  });
  await page.getByRole("button", { name: "Save Monthly Pattern" }).click();
  await expect(page.getByRole("status")).toContainText(
    "บันทึก Annual PM Setup แล้ว",
  );
  await expect(page.getByText("Regeneration Required")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator("[data-pm-monthly-pattern]")).toBeVisible();
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
  await expect(page.getByText(`January ${year}`)).toBeVisible();
  await expect(page.getByText((selectedTarget ?? "").trim()).first()).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Annual PM Plan – Monthly Pattern",
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
