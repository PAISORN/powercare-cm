import { expect, test } from "@playwright/test";

test("engineer can open waiting-to-close work detail", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("engineer-electrical");
  await page.getByPlaceholder("Password").fill("password1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/work");
  await expect(page.getByText("CM-2026-06-0002")).toBeVisible();
  await page.getByText("CM-2026-06-0002").click();
  await expect(page.getByText("ตรวจรับวิศวกร")).toBeVisible();
});
