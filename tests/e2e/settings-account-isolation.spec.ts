import { expect, test, type Page } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill("password1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "การตั้งค่าส่วนบุคคล", exact: true })).toBeVisible();
}
async function logout(page: Page) {
  await page.goto("/logout");
  await page.getByRole("button", { name: "Confirm logout", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("html")).toHaveAttribute("data-background", "image-maintenance");
}

test("separates two accounts on one browser and restores preferences on another device", async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  // Ownerless cookies from older versions must not be adopted by either account.
  await page.context().addCookies([{ name: "powercare-background", value: "image-prism-cloud", url: baseURL! }]);
  await login(page, "site-admin");
  await page.getByRole("radio", { name: /ห้องควบคุม/ }).check();
  await page.getByRole("radio", { name: /^กลางคืน/ }).check();
  await page.getByRole("button", { name: "บันทึกการตั้งค่า", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-background", "image-control-room");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await page.reload();
  await expect(page.getByRole("radio", { name: /ห้องควบคุม/ })).toBeChecked();
  const accountSwitchTab = await page.context().newPage();
  await login(accountSwitchTab, "engineer-electrical");
  await page.getByRole("button", { name: "บันทึกการตั้งค่า", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "บัญชีผู้ใช้เปลี่ยนแล้ว" })).toBeVisible();
  await accountSwitchTab.reload();
  await expect(accountSwitchTab.locator("html")).toHaveAttribute("data-background", "image-maintenance");
  await accountSwitchTab.close();
  await logout(page);
  await login(page, "engineer-electrical");
  await expect(page.locator("html")).toHaveAttribute("data-background", "image-maintenance");
  await page.getByRole("radio", { name: /ระบบเครื่องจักร/ }).check();
  await page.getByRole("radio", { name: /^สว่าง/ }).check();
  await page.getByRole("button", { name: "บันทึกการตั้งค่า", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-background", "image-mechanical-hall");
  await logout(page);
  await login(page, "site-admin");
  await expect(page.locator("html")).toHaveAttribute("data-background", "image-control-room");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  // The global navbar theme toggle must update only this account, retaining its image.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".app-workspace")).toHaveCSS("margin-left", "0px");
  await expect(page.getByTestId("theme-toggle-compact")).toHaveAttribute("aria-label", "Night mode");
  await page.getByTestId("theme-toggle-compact").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  await expect(page.getByRole("radio", { name: /^สว่าง/ })).toBeChecked();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  await expect(page.locator("html")).toHaveAttribute("data-background", "image-control-room");
  const freshDevice = await browser.newContext({ baseURL });
  try {
    const otherPage = await freshDevice.newPage();
    await login(otherPage, "site-admin");
    await expect(otherPage.locator("html")).toHaveAttribute("data-background", "image-control-room");
    await expect(otherPage.locator("html")).toHaveAttribute("data-theme", "day");
    await otherPage.getByRole("radio", { name: /โรงงานยามเช้า/ }).check();
    await otherPage.getByRole("button", { name: "บันทึกการตั้งค่า", exact: true }).click();
    await expect(otherPage.locator("html")).toHaveAttribute("data-background", "image-plant-dawn");
  } finally { await freshDevice.close(); }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-background", "image-plant-dawn");
  await page.setViewportSize({ width: 1440, height: 1000 });
  const control = page.getByRole("radio", { name: /ห้องควบคุม/ });
  await control.locator("xpath=../../..").screenshot({ path: join(tmpdir(), "powercare-account-backgrounds-desktop.png"), caret: "initial" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".app-workspace")).toHaveCSS("margin-left", "0px");
  await page.getByRole("radio", { name: /โรงงานยามเช้า/ }).locator("xpath=../..").screenshot({ path: join(tmpdir(), "powercare-account-background-mobile.png"), caret: "initial" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await logout(page);
  await login(page, "engineer-electrical");
  await expect(page.locator("html")).toHaveAttribute("data-background", "image-mechanical-hall");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  expect(errors).toEqual([]);
});
