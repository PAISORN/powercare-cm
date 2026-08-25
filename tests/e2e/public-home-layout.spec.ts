import { expect, test } from "@playwright/test";

test("public home removes the requested shortcut buttons", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("header").getByRole("link", { name: "Request CM" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Safety" })).toHaveCount(0);
  await expect(page.getByText("Create Request")).toBeVisible();
  await expect(page.getByRole("link", { name: /แจ้งซ่อมทันที/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /ติดตามสถานะงาน/ })).toBeVisible();
});

test("public home mirrors dashboard as read-only with dashboard filters", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("CM Operations Dashboard")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Status Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monthly CM Trend" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plant Zone Workload" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Priority Work Queue" })).toBeVisible();

  await expect(page.getByLabel("KPI Total CM")).toBeVisible();
  await expect(page.getByRole("link", { name: /KPI Total CM/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /CM-2026-/ })).toHaveCount(0);

  await expect(page.getByLabel("Work Category")).toBeVisible();
  await expect(page.getByLabel("Time Range")).toBeVisible();

  await page.getByLabel("Work Category").selectOption("mechanical");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/\?category=mechanical/);
  await expect(page.getByLabel("Work Category")).toHaveValue("mechanical");

  await page.getByLabel("Work Category").selectOption("electrical");
  await page.getByLabel("Time Range").selectOption("last-3-months");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/\?category=electrical&timeRange=last-3-months/);
  await expect(page.getByLabel("Time Range")).toHaveValue("last-3-months");
});

test("public header uses day/night switch and highlighted staff login", async ({ page }) => {
  await page.goto("/");

  const themeSwitch = page.getByRole("button", { name: /Day mode|Night mode/ });
  await expect(themeSwitch).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", /day|night/);

  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await themeSwitch.click();
  const toggledTheme = await page.locator("html").getAttribute("data-theme");
  expect(toggledTheme).not.toBe(initialTheme);
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", toggledTheme ?? "");

  const staffLogin = page.getByTestId("staff-login-link");
  await expect(staffLogin).toBeVisible();
  await expect(staffLogin).toHaveClass(/bg-\[var\(--primary\)\]/);
});

test("night theme is applied before app content renders on navigation", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("cm-theme-mode", "night");
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await expect(page.getByRole("button", { name: "Night mode" })).toBeVisible();

  await page.goto("/tracking?number=CM-2026-06-0001", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
  await expect(page.getByRole("button", { name: "Night mode" })).toBeVisible();
});

test("public mobile header keeps staff login beside day/night switch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const staffLogin = page.getByTestId("staff-login-link");
  const themeSwitch = page.getByRole("button", { name: /Day mode|Night mode/ });
  await expect(staffLogin).toBeVisible();
  await expect(themeSwitch).toBeVisible();

  const loginBox = await staffLogin.boundingBox();
  const themeBox = await themeSwitch.boundingBox();
  expect(loginBox).not.toBeNull();
  expect(themeBox).not.toBeNull();
  expect(loginBox!.width).toBeLessThanOrEqual(44);
  expect(themeBox!.width).toBeLessThanOrEqual(92);
  expect(loginBox!.x + loginBox!.width).toBeLessThanOrEqual(themeBox!.x);
});

test("public mobile charts keep chart content inside their panels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  for (const title of ["Status Overview", "Monthly CM Trend"]) {
    const panel = page.getByRole("heading", { name: title }).locator("xpath=ancestor::section[1]");
    await expect(panel).toBeVisible();

    const overflowingChildren = await panel.evaluate((element) => {
      const panelRect = element.getBoundingClientRect();
      return Array.from(element.querySelectorAll("*"))
        .map((child) => {
          const rect = child.getBoundingClientRect();
          return {
            text: child.textContent?.trim().slice(0, 40) ?? "",
            left: rect.left,
            right: rect.right,
          };
        })
        .filter((rect) => rect.left < panelRect.left - 2 || rect.right > panelRect.right + 2);
    });

    expect(overflowingChildren, `${title} should not clip or overflow on mobile`).toEqual([]);
  }
});
