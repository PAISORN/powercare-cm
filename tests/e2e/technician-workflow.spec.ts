import { expect, test } from "@playwright/test";

test("technician can open work list and see seeded CM work", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("tech-electrical");
  await page.getByPlaceholder("Password").fill("password1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/work");
  await page.getByPlaceholder("Search CM number, machine, requester").fill("CM-2026-06-0001");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByText("CM-2026-06-0001")).toBeVisible();
  await page.getByText("CM-2026-06-0001").click();
  await expect(page.getByRole("heading", { name: "CM-2026-06-0001" })).toBeVisible();
});

test("technician can upload profile photo and see it in work results", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("tech-electrical");
  await page.getByPlaceholder("Password").fill("password1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Electrical Technician" })).toBeVisible();
  await page.locator('input[name="profilePhoto"]').setInputFiles({
    name: "profile.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
  });
  await page.getByRole("button", { name: "บันทึกรูปโปรไฟล์" }).click();
  await expect(page.getByText("บันทึกรูปโปรไฟล์แล้ว")).toBeVisible();

  await expect(page.getByTestId("sidebar-user-avatar").getByAltText("Electrical Technician profile photo")).toBeVisible();

  await page.goto("/work");
  await page.getByPlaceholder("Search CM number, machine, requester").fill("CM-2026-06-0002");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page.getByAltText("Electrical Technician profile photo").first()).toBeVisible();
});
