import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm/);
}

test("dashboard shows the current operational overview", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText("CM Operations Dashboard")).toBeVisible();
  for (const label of ["KPI Total CM", "KPI New Request", "KPI In Process", "KPI Closed", "KPI Cancel"]) {
    await expect(page.getByRole("button", { name: new RegExp(label) })).toBeVisible();
  }
  for (const heading of ["Monthly CM Trend", "Status Overview", "Plant Zone Workload", "Priority Work Queue"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByLabel("Work Category")).toBeVisible();
  await expect(page.getByRole("button", { name: "Default dashboard periods" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export Report" })).toHaveCount(0);
});

test("dashboard category filter preserves the overview", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Work Category").selectOption("mechanical");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/category=mechanical/);
  await expect(page.getByLabel("Work Category")).toHaveValue("mechanical");
  await expect(page.getByRole("heading", { name: "Monthly CM Trend" })).toBeVisible();
});

test("dashboard date control exposes current period choices", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Default dashboard periods" }).click();
  await expect(page.getByRole("dialog", { name: "เลือกช่วงวันที่" })).toBeVisible();
});

test("dashboard KPI controls open the matching work filter", async ({ page }) => {
  await signIn(page);
  for (const [label, expected] of [
    ["KPI New Request", /status=NEW/], ["KPI In Process", /statusGroup=IN_PROCESS/],
    ["KPI Closed", /status=CLOSED/], ["KPI Cancel", /status=CANCELED/], ["KPI Total CM", /\/work(?:\?|$)/],
  ] as const) {
    await page.goto("/dashboardcm");
    await page.getByRole("button", { name: new RegExp(label) }).click();
    await expect(page).toHaveURL(expected);
  }
});
