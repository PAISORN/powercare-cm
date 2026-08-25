import { expect, test } from "@playwright/test";
import { db } from "../../lib/db";

test.afterAll(async () => { await db.$disconnect(); });

test("work list can filter by status and clear filters", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm/);

  await page.goto("/work");
  await expect(page.getByLabel("Status KPI strip")).toBeVisible();
  await expect(page.getByLabel("Status KPI NEW")).toBeVisible();
  await expect(page.getByLabel("Status KPI CANCELED")).toBeVisible();
  await page.getByLabel("Status KPI WAITING_TO_CLOSE").click();
  await expect(page).toHaveURL(/status=WAITING_TO_CLOSE/);
  await expect(page.getByText(/items/)).not.toHaveText("0 items");
  await page.goto("/work");

  await expect(page.getByText(/items/)).not.toHaveText("0 items");

  await page.locator("select[name='status']").selectOption("WAITING_TO_CLOSE");
  await page.getByRole("button", { name: "Filter" }).click();

  await expect(page).toHaveURL(/status=WAITING_TO_CLOSE/);
  await expect(page.getByText(/items/)).not.toHaveText("0 items");

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/work$/);
  await expect(page.getByText(/items/)).not.toHaveText("0 items");
});

test("work list paginates results after 50 items", async ({ page }) => {
  const admin = await db.user.findUniqueOrThrow({ where: { username: "admin" } });
  const category = await db.category.findFirstOrThrow({ where: { plantId: admin.plantId! } });
  const zone = await db.zone.findFirstOrThrow({ where: { plantId: admin.plantId! } });
  const stamp = Date.now();
  await db.cmWork.createMany({ data: Array.from({ length: 51 }, (_, index) => ({
    number: `CM-E2E-PAGE-${stamp}-${String(index).padStart(2, "0")}`,
    requesterName: "Pagination E2E", requesterDepartment: "Maintenance", organizationId: admin.organizationId!, plantId: admin.plantId!,
    categoryId: category.id, zoneId: zone.id, machineName: `Pagination Asset ${index}`,
    problemTitle: "Pagination coverage", problemDetail: "Deterministic E2E row", urgency: "NORMAL", status: "NEW",
  })) });
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm/);

  await page.goto("/work");
  const pagination = page.getByRole("navigation", { name: "Work results pagination" });
  await expect(pagination).toBeVisible();
  await expect(pagination.getByRole("link", { name: "1" })).toHaveAttribute("aria-current", "page");
  await expect(pagination.getByRole("link", { name: "2" })).toBeVisible();

  await pagination.getByRole("link", { name: "ถัดไป" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(/Page 2\//)).toBeVisible();
});

test("work list can search by machine name", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill("admin");
  await page.getByPlaceholder("Password").fill("admin1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm/);

  await page.goto("/work");
  await page.getByPlaceholder("Search CM number, machine, requester").fill("Feed Pump");
  await page.getByRole("button", { name: "Filter" }).click();

  await expect(page).toHaveURL(/search=Feed\+Pump/);
  await expect(page.getByText(/items/)).not.toHaveText("0 items");
});
