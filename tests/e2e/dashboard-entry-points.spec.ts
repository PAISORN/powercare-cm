import { expect, test } from "@playwright/test";

test("dashboard no longer exposes the old shortcut bar", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link", { name: "PowerCare.CM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Request" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Track Work" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export Report" })).toHaveCount(0);
  await expect(page.getByLabel("KPI Total CM")).toBeVisible();
});

test("signed-in menu request and tracking pages keep the staff session shell", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Create Request" }).click();
  await expect(page).toHaveURL(/\/request/);
  await expect(page.getByRole("link", { name: "PowerCare.CM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();
  await page.locator("input[name='requesterName']").fill("Logged User");
  await page.locator("input[name='requesterDepartment']").fill("Maintenance");
  await page.locator("select[name='categoryId']").selectOption({ index: 1 });
  await page.locator("select[name='zoneId']").selectOption({ index: 1 });
  await page.locator("input[name='machineName']").fill("Logged Pump");
  await page.locator("input[name='problemTitle']").fill("Logged request check");
  await page.locator("textarea[name='problemDetail']").fill("Check signed-in request shell");
  await page.locator("select[name='urgency']").selectOption("NORMAL");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/request\/success\/CM-\d{4}-\d{2}-\d{4}/);
  await expect(page.getByRole("link", { name: "PowerCare.CM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();

  await page.getByRole("link", { name: "Track Work" }).click();
  await expect(page).toHaveURL(/\/tracking/);
  await expect(page.getByRole("link", { name: "PowerCare.CM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();
});

test("public home shows the read-only operations dashboard", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("CM Operations Dashboard")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monthly CM Trend" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Status Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plant Zone Workload" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Priority Work Queue" })).toBeVisible();
  await expect(page.getByText("6-month view")).toBeVisible();
  await expect(page.getByRole("link", { name: /แจ้งซ่อมทันที/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /ติดตามสถานะงาน/ })).toBeVisible();
});
