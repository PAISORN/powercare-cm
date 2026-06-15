import { expect, test } from "@playwright/test";

test("user can log out and must sign in again before opening the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole("link", { name: "Logout" }).click();
  await expect(page.getByRole("heading", { name: "Logout" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm logout" }).click();

  await expect(page).toHaveURL(/\/login\?loggedOut=1/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("mobile dashboard header keeps logout beside day/night switch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await expect(page).toHaveURL(/\/dashboard/);
  const logout = page.getByRole("link", { name: "Logout" });
  const themeSwitch = page.getByRole("button", { name: /Day mode|Night mode/ });
  await expect(logout).toBeVisible();
  await expect(themeSwitch).toBeVisible();

  const logoutBox = await logout.boundingBox();
  const themeBox = await themeSwitch.boundingBox();
  expect(logoutBox).not.toBeNull();
  expect(themeBox).not.toBeNull();
  expect(logoutBox!.width).toBeLessThanOrEqual(44);
  expect(themeBox!.width).toBeLessThanOrEqual(92);
  expect(logoutBox!.x + logoutBox!.width).toBeLessThanOrEqual(themeBox!.x);
});
