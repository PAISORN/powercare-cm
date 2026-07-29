import { expect, test } from "@playwright/test";

test("user can log out and must sign in again before opening the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("dialog", { name: "ออกจากระบบ?" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm logout" }).click();

  await expect(page).toHaveURL(/\/login\?loggedOut=1/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("mobile menu opens the logout confirmation without leaving the dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("dialog", { name: "ออกจากระบบ?" })).toBeVisible();
  await page.getByRole("button", { name: "ยกเลิก" }).click();
  await expect(page.getByRole("dialog", { name: "ออกจากระบบ?" })).toHaveCount(0);
});
