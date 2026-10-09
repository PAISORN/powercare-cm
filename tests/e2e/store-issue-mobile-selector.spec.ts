import { expect, test } from "@playwright/test";
import { db } from "../../lib/db";

let inventoryCode = "";

test.beforeAll(async () => {
  if (/^postgres(?:ql)?:\/\//i.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("Store issue selector visual QA must use a disposable or local SQLite database");
  }

  const plant = await db.plant.findFirstOrThrow({
    where: { active: true },
    orderBy: { code: "asc" },
    select: { id: true, inventoryCode: true },
  });
  inventoryCode = plant.inventoryCode ?? "PWC";
  await db.plant.update({
    where: { id: plant.id },
    data: { inventoryCode, publicStoreIssueEnabled: true },
  });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("mobile stock suggestions stay attached to the issue form", async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(`console.error: ${message.text()}`);
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/p/${inventoryCode.toLowerCase()}/store/issue`);
  await expect(page.getByRole("heading", { name: "รายการที่ต้องการเบิก" })).toBeVisible();

  const search = page.getByRole("combobox", { name: "ค้นหาและเลือกอะไหล่ รายการ 1" });
  await search.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await search.focus();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();

  const layout = await listbox.evaluate((element) => {
    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="ค้นหาและเลือกอะไหล่ รายการ 1"]',
    );
    const listRect = element.getBoundingClientRect();
    const inputRect = input?.getBoundingClientRect();
    return {
      position: getComputedStyle(element).position,
      listBottom: listRect.bottom,
      listHeight: listRect.height,
      listLeft: listRect.left,
      listRight: listRect.right,
      inputBottom: inputRect?.bottom ?? 0,
      inputLeft: inputRect?.left ?? 0,
      inputRight: inputRect?.right ?? 0,
      viewportWidth: window.innerWidth,
    };
  });

  expect(layout.position).toBe("absolute");
  expect(layout.listHeight).toBeLessThanOrEqual(288);
  expect(layout.listLeft).toBeGreaterThanOrEqual(layout.inputLeft - 1);
  expect(layout.listRight).toBeLessThanOrEqual(layout.inputRight + 1);
  expect(layout.listRight).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.listBottom).toBeGreaterThan(layout.inputBottom);

  await page.screenshot({
    path: testInfo.outputPath("store-issue-selector-mobile.png"),
    fullPage: false,
    caret: "initial",
  });

  const firstOption = listbox.getByRole("option").first();
  const selectedName = (await firstOption.locator("span > span").first().textContent())?.trim();
  await firstOption.click();
  await expect(listbox).toHaveCount(0);
  if (selectedName) await expect(page.getByText(selectedName, { exact: true }).first()).toBeVisible();
  expect(browserErrors).toEqual([]);
});
