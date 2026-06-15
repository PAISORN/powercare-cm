import { expect, test } from "@playwright/test";

test("dashboard shows operational overview sections without the old shortcut bar", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link", { name: "Export Report" })).toHaveCount(0);
  await expect(page.getByText("CM Operations Dashboard")).toBeVisible();
  await expect(page.getByRole("link", { name: /KPI Total CM/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /KPI New Request/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /KPI In Process/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /KPI Closed/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /KPI Cancel/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monthly CM Trend" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Status Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plant Zone Workload" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Priority Work Queue" })).toBeVisible();
  await expect(page.getByLabel("Work Category")).toBeVisible();
  await expect(page.getByLabel("Time Range")).toBeVisible();
  const filterBar = page.getByTestId("dashboard-filter-bar");
  await expect(filterBar.getByRole("link", { name: /Overview/ })).toHaveCount(0);
  await expect(filterBar.getByRole("link", { name: /Mechanical/ })).toHaveCount(0);
  await expect(filterBar.getByRole("link", { name: /Electrical/ })).toHaveCount(0);
});

test("dashboard dropdown filters the operational sections", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await page.getByLabel("Work Category").selectOption("mechanical");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/\/dashboard\?category=mechanical/);
  await expect(page.getByLabel("Work Category")).toHaveValue("mechanical");
  await expect(page.getByRole("heading", { name: "Status Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monthly CM Trend" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Plant Zone Workload" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Priority Work Queue" })).toBeVisible();

  await page.getByRole("link", { name: /KPI New Request/ }).click();
  await expect(page).toHaveURL(/\/work\?categoryId=.+&status=NEW/);
});

test("dashboard time range dropdown applies to the overview", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await page.getByLabel("Time Range").selectOption("last-3-months");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/\/dashboard\?timeRange=last-3-months/);
  await expect(page.getByLabel("Time Range")).toHaveValue("last-3-months");
  await expect(page.getByRole("heading", { name: "Monthly CM Trend" })).toBeVisible();

  await page.getByLabel("Work Category").selectOption("electrical");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/\/dashboard\?category=electrical&timeRange=last-3-months/);
});

test("dashboard KPI cards open the work list with the matching filter", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();

  await page.getByRole("link", { name: /KPI New Request/ }).click();
  await expect(page).toHaveURL(/\/work\?status=NEW/);
  await expect(page.locator('select[name="status"]')).toHaveValue("NEW");

  await page.goto("/dashboard");
  await page.getByRole("link", { name: /KPI In Process/ }).click();
  await expect(page).toHaveURL(/\/work\?statusGroup=IN_PROCESS/);
  await expect(page.getByText("In Process")).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("link", { name: /KPI Closed/ }).click();
  await expect(page).toHaveURL(/\/work\?status=CLOSED/);
  await expect(page.locator('select[name="status"]')).toHaveValue("CLOSED");

  await page.goto("/dashboard");
  await page.getByRole("link", { name: /KPI Cancel/ }).click();
  await expect(page).toHaveURL(/\/work\?status=CANCELED/);
  await expect(page.locator('select[name="status"]')).toHaveValue("CANCELED");

  await page.goto("/dashboard");
  await page.getByRole("link", { name: /KPI Total CM/ }).click();
  await expect(page).toHaveURL(/\/work$/);
});
