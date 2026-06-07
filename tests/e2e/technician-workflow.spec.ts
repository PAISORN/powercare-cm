import { expect, test } from "@playwright/test";

test("technician can open work list and see seeded CM work", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("tech-electrical");
  await page.getByPlaceholder("Password").fill("password1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/work");
  await expect(page.getByText("CM-2026-06-0001")).toBeVisible();
  await page.getByText("CM-2026-06-0001").click();
  await expect(page.getByRole("heading", { name: "CM-2026-06-0001" })).toBeVisible();
});
