import { expect, test } from "@playwright/test";

test("admin can open back office pages", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm/);
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
  await expect(page.getByRole("heading", { name: "ประวัติการจัดการระบบ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "รายการล่าสุด" })).toBeVisible();
});

test("admin creates, edits, deactivates, resets password, deletes, and audits a user", async ({ page }) => {
  const stamp = Date.now();
  const username = `e2e-user-${stamp}`;
  const updatedUsername = `e2e-updated-${stamp}`;
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm/);

  await page.goto("/admin/users");
  const createForm = page.locator("#create-user-form");
  await createForm.getByPlaceholder("Username").fill(username);
  await createForm.getByPlaceholder("Password").fill("password1234");
  await createForm.getByPlaceholder("ชื่อ-นามสกุล").fill("E2E Managed User");
  await createForm.getByPlaceholder("หน่วยงาน").fill("Maintenance");
  await createForm.locator('select[name="role"]').selectOption("TECHNICIAN");
  await createForm.locator('select[name="plantId"]').selectOption({ index: 1 });
  await createForm.locator('input[name="categoryIds"]').first().check();
  await createForm.getByRole("button", { name: "สร้างผู้ใช้" }).click();

  const createdCard = page.locator(`div[aria-label="User ${username}"]`);
  await createdCard.getByText("ดูรายละเอียด / แก้ไข").click();
  const editForm = createdCard.getByRole("form", { name: `Edit ${username}` });
  await expect(editForm).toBeVisible();
  await editForm.locator('input[name="username"]').fill(updatedUsername);
  await editForm.locator('input[name="password"]').fill("newpass1234");
  await editForm.locator('input[name="active"]').uncheck();
  await editForm.getByRole("button", { name: "บันทึกทั้งหมด" }).click();
  const updatedCard = page.locator(`div[aria-label="User ${updatedUsername}"]`);
  await updatedCard.getByText("ดูรายละเอียด / แก้ไข").click();
  const updatedForm = updatedCard.getByRole("form", { name: `Edit ${updatedUsername}` });
  await expect(updatedForm.locator('input[name="active"]')).not.toBeChecked();

  await updatedCard.getByRole("button", { name: `Delete ${updatedUsername}` }).click();
  const wrongPasswordInput = page.locator('input[name="adminPassword"]');
  await wrongPasswordInput.fill("definitely-wrong-password");
  await wrongPasswordInput.press("Enter");
  await expect(page.getByText("โปรดตรวจสอบรหัสผ่าน")).toBeVisible();
  await expect(page.locator(`div[aria-label="User ${updatedUsername}"]`)).toBeVisible();

  await updatedCard.getByRole("button", { name: `Delete ${updatedUsername}` }).click();
  const correctPasswordInput = page.locator('input[name="adminPassword"]');
  await correctPasswordInput.fill("admin1234");
  await correctPasswordInput.press("Enter");
  await expect(page.getByText("ลบสำเร็จ")).toBeVisible();
  await page.goto("/admin/history");
  await expect(page.getByText("ลบผู้ใช้งาน").first()).toBeVisible();
  await expect(page.getByText("E2E Managed User").first()).toBeVisible();
});
