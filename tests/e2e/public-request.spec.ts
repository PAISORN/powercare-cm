import { expect, test } from "@playwright/test";

test("requester submits repair request and sees tracking number", async ({ page }) => {
  await page.goto("/request");
  await page.getByPlaceholder("ชื่อผู้แจ้ง").fill("Requester A");
  await page.getByPlaceholder("หน่วยงาน/แผนก").fill("Operations");
  await page.locator("select[name='categoryId']").selectOption({ index: 1 });
  await page.locator("select[name='zoneId']").selectOption({ index: 1 });
  await page.getByPlaceholder("ชื่อเครื่องจักร").fill("Feed Pump");
  await page.getByPlaceholder("หัวข้อปัญหา").fill("Pump vibration");
  await page.getByPlaceholder("รายละเอียดปัญหา").fill("Vibration detected during operation");
  await page.locator("select[name='urgency']").selectOption("URGENT");
  await page.getByRole("button", { name: "ส่งแจ้งซ่อม" }).click();
  await expect(page.getByText(/CM-\d{4}-\d{2}-\d{4}/)).toBeVisible();
});
