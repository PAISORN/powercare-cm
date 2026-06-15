import { expect, test } from "@playwright/test";

test("engineer can open waiting-to-close work detail", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("engineer-electrical");
  await page.getByPlaceholder("Password").fill("password1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/work");
  await page.getByPlaceholder("Search CM number, machine, requester").fill("CM-2026-06-0002");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByText("CM-2026-06-0002")).toBeVisible();
  await page.getByText("CM-2026-06-0002").click();
  await expect(page.getByRole("heading", { name: "CM-2026-06-0002" })).toBeVisible();
});
