import { expect, test } from "@playwright/test";

test("public home presents product modules and primary login CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "PowerCare", exact: true })).toBeVisible();
  await expect(page.getByText("บริหารงานซ่อมบำรุง")).toBeVisible();
  await expect(page.getByRole("link", { name: /เริ่มใช้งาน PowerCare/ })).toBeVisible();
  for (const moduleName of ["Corrective Maintenance", "Spare Parts & Store", "Preventive Maintenance", "Asset Management"]) {
    await expect(page.getByText(moduleName, { exact: true }).first()).toBeVisible();
  }
});

test("public header theme control works and login remains available", async ({ page }) => {
  await page.goto("/");
  const themeSwitch = page.getByRole("button", { name: /Day mode|Night mode/ });
  await expect(themeSwitch).toBeVisible();
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await themeSwitch.click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme ?? "");
  const toggled = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", toggled ?? "");
  await expect(page.locator('a[href="/login"]').first()).toBeVisible();
});

test("theme control is available on landing and tracking", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Day mode|Night mode/ })).toBeVisible();
  await page.goto("/tracking?number=CM-2026-06-0001");
  await expect(page.getByRole("button", { name: /Day mode|Night mode/ })).toBeVisible();
});

test("public mobile header keeps login and theme controls visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator('a[href="/login"]').first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Day mode|Night mode/ })).toBeVisible();
});

test("public landing does not overflow horizontally on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "PowerCare", exact: true })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  const overflowing = await page.locator("main").evaluate((main) => Array.from(main.querySelectorAll("section, article, header")).filter((node) => {
    const rect = node.getBoundingClientRect(); return rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
  }).length);
  expect(overflowing).toBe(0);
});
