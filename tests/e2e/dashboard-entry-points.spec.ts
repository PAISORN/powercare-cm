import { expect, test } from "@playwright/test";

test("dashboard no longer exposes the old shortcut bar", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await expect(page).toHaveURL(/\/dashboardcm/);
  await expect(page.getByTestId("desktop-sidebar-nav").getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ภาพรวมงานซ่อม Power Care.CM" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export Report" })).toHaveCount(0);
  await expect(page.getByLabel("KPI Total CM")).toBeVisible();
});

test("signed-in public entry points preserve the authenticated dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm/);

  await page.goto("/request");
  await expect(page).toHaveURL(/\/dashboardcm/);
  await page.goto("/tracking");
  await expect(page).toHaveURL(/\/dashboardcm/);
  await expect(page.getByTestId("desktop-sidebar-nav").getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
});

test("public home shows the PowerCare product landing", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "PowerCare", exact: true })).toBeVisible();
  await expect(page.getByText("บริหารงานซ่อมบำรุง")).toBeVisible();
  await expect(page.getByRole("link", { name: /เริ่มใช้งาน PowerCare/ })).toBeVisible();
  await expect(page.getByText("Corrective Maintenance", { exact: true })).toBeVisible();
});
