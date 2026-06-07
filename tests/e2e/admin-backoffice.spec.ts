import { expect, test } from "@playwright/test";

test("admin can open back office pages", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await page.goto("/admin/categories");
  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
  await page.goto("/admin/zones");
  await expect(page.getByRole("heading", { name: "Zones" })).toBeVisible();
  await page.goto("/admin/sla");
  await expect(page.getByRole("heading", { name: "SLA Settings" })).toBeVisible();
  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: "Audit Trail" })).toBeVisible();
});
