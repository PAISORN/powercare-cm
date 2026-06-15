import { expect, test } from "@playwright/test";

test("admin can open back office pages", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
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
  await expect(page.getByText("Back Office Timeline")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Action Summary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Event Timeline" })).toBeVisible();
  await page.goto("/admin/history");
  await expect(page.getByRole("heading", { name: "Add / Delete History" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "History List" })).toBeVisible();
});

test("admin can edit and delete another user's profile details", async ({ page }) => {
  const stamp = Date.now();
  const username = `role-edit-${stamp}`;
  const updatedUsername = `role-updated-${stamp}`;
  const fullName = `Role Edit ${stamp}`;
  const updatedFullName = `Role Updated ${stamp}`;

  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/admin/users");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill("password1234");
  await page.getByPlaceholder("ชื่อ-นามสกุล").fill(fullName);
  await page.getByPlaceholder("หน่วยงาน").fill("E2E");
  await page.locator('form[action] select[name="role"]').first().selectOption("TECHNICIAN");
  await page.locator('form[action] select[name="categoryId"]').first().selectOption({ index: 1 });
  await page.getByRole("button", { name: "สร้างผู้ใช้" }).click();

  const editForm = page.getByRole("form", { name: `Edit ${username}` });
  await expect(editForm).toBeVisible();
  await editForm.locator('input[name="username"]').fill(updatedUsername);
  await editForm.locator('input[name="fullName"]').fill(updatedFullName);
  await editForm.locator('input[name="department"]').fill("Maintenance");
  await editForm.locator('select[name="role"]').selectOption("ENGINEER");
  await editForm.locator('input[name="password"]').fill("newpass1234");
  await editForm.locator('input[name="signature"]').setInputFiles({
    name: "signature.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
  });
  await editForm.locator('input[name="profilePhoto"]').setInputFiles({
    name: "profile.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64"),
  });
  await editForm.locator('input[name="active"]').uncheck();
  await editForm.getByRole("button", { name: "บันทึกทั้งหมด" }).click();

  const updatedForm = page.getByRole("form", { name: `Edit ${updatedUsername}` });
  await expect(updatedForm.locator('select[name="role"]')).toHaveValue("ENGINEER");
  await expect(updatedForm.locator('input[name="fullName"]')).toHaveValue(updatedFullName);
  await expect(updatedForm.locator('input[name="department"]')).toHaveValue("Maintenance");
  await expect(updatedForm.locator('input[name="active"]')).not.toBeChecked();
  await expect(page.getByText(`${updatedUsername} · Maintenance · มีลายเซ็น · มีรูปโปรไฟล์`)).toBeVisible();
  await expect(page.getByAltText(`${updatedFullName} profile photo`)).toBeVisible();

  const updatedCard = page.locator(`div[aria-label="User ${updatedUsername}"]`);
  await updatedCard.getByRole("button", { name: `Delete ${updatedUsername}` }).click();
  await expect(page.getByRole("heading", { name: "ต้องการลบ User จริงหรือไม่?" })).toBeVisible();
  await page.locator('input[name="adminPassword"]').fill("wrong-password");
  await page.getByRole("button", { name: "Confirm delete user" }).click();
  await expect(page.getByText("ไม่สำเร็จ")).toBeVisible();
  await expect(page.getByText("โปรดตรวจสอบรหัสผ่าน")).toBeVisible();
  await expect(page.getByRole("form", { name: `Edit ${updatedUsername}` })).toBeVisible();

  await updatedCard.getByRole("button", { name: `Delete ${updatedUsername}` }).click();
  await page.locator('input[name="adminPassword"]').fill("admin1234");
  await page.getByRole("button", { name: "Confirm delete user" }).click();
  await expect(page.getByText("ลบสำเร็จ")).toBeVisible();
  await expect(page.getByRole("form", { name: `Edit ${updatedUsername}` })).toHaveCount(0);

  await page.goto("/admin/history");
  await expect(page.getByText("ลบ User").first()).toBeVisible();
  await expect(page.getByText(updatedFullName)).toBeVisible();
});
