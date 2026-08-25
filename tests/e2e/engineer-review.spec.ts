import { expect, test } from "@playwright/test";

test("engineer can open waiting-to-close work detail", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("engineer-electrical");
  await page.getByPlaceholder("Password").fill("password1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm/);
  await page.goto("/work?mode=range&startDate=2026-01-01&endDate=2026-12-31");
  await page.getByPlaceholder("Search CM number, machine, requester").fill("CM-2026-06-0002");
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByText("CM-2026-06-0002", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "CM-2026-06-0002" })).toBeVisible();
});
