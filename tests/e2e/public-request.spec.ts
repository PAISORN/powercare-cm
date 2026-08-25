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
  await expect(page).toHaveURL(/\/request\/success\/CM-\d{4}-\d{2}-\d{4}/);
  await expect(page.getByText(/CM-\d{4}-\d{2}-\d{4}/)).toBeVisible();
  await expect(page.getByLabel("request-success-icon")).toBeVisible();
});

test("request success page shows failure state for an unknown CM number", async ({ page }) => {
  await page.goto("/request/success/CM-0000-00-0000");

  await expect(page.getByLabel("request-failed-icon")).toBeVisible();
  await expect(page.getByText("ส่งแจ้งซ่อมไม่สำเร็จ")).toBeVisible();
  await expect(page.getByText("กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบการบันทึกข้อมูล")).toBeVisible();
});

test("requester can view tracking timeline by CM number", async ({ page }) => {
  await page.goto("/tracking?number=CM-2026-06-0001");

  await expect(page.getByText("CM Tracking")).toBeVisible();
  await expect(page.getByText("CM-2026-06-0001")).toBeVisible();
  await expect(page.getByText("รับเข้าระบบ")).toBeVisible();
  await expect(page.getByText("ระหว่างดำเนินการ")).toBeVisible();
  await expect(page.getByText("รอตรวจรับ/ปิดงาน")).toBeVisible();
  await expect(page.getByText("ประวัติสถานะ")).toBeVisible();
});

test("tracking steps stay in one row on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tracking?number=CM-2026-06-0001");

  const first = page.getByText("รับเข้าระบบ");
  const second = page.getByText("ระหว่างดำเนินการ");
  const third = page.getByText("รอตรวจรับ/ปิดงาน");
  const fourth = page.getByText("ปิดงานสำเร็จ");
  await expect(first).toBeVisible();
  await expect(fourth).toBeVisible();

  const boxes = await Promise.all([first.boundingBox(), second.boundingBox(), third.boundingBox(), fourth.boundingBox()]);
  boxes.forEach((box) => expect(box).not.toBeNull());
  const yPositions = boxes.map((box) => box!.y);
  expect(Math.max(...yPositions) - Math.min(...yPositions)).toBeLessThanOrEqual(32);
});
