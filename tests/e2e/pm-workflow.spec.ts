import { expect, test, type Page } from "@playwright/test";
import { db } from "../../lib/db";
import { createPmGroup } from "../../modules/pm/pm-group-service";
import { addDraftPmGroup, createOrGetDraftPmPlan } from "../../modules/pm/pm-plan-service";
import { listEligiblePmAssignees } from "../../modules/pm/pm-work-service";

let planId = "";
let workId = "";
let assetId = "";
let organizationId = "";
let plantId = "";
let plannedDateKey = "";
let technicianId = "";
let linkedCmNumber = "";

function captureBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(`pageerror: ${error.message}`));
  page.on("console", message => { if (message.type() === "error") errors.push(`console.error: ${message.text()}`); });
  return errors;
}

async function login(page: Page, username: string, password = "password1234") {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(password);
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm(?:\/|$)/, { timeout: 15_000 });
}

test.beforeAll(async () => {
  const actor = await db.user.findUniqueOrThrow({ where: { username: "site-admin" } });
  organizationId = actor.organizationId!;
  plantId = actor.plantId!;
  let asset = await db.asset.findFirst({
    where: { plantId, registrationStatus: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (!asset) {
    const assetClass = await db.assetClass.create({ data: { plantId, nameTh: "เครื่องจักร E2E", nameEn: "E2E Machine" } });
    const family = await db.assetFamily.create({ data: { plantId, code: `E2E${Date.now().toString(36).slice(-4)}`, nameTh: "ชุดเครื่องจักร E2E" } });
    asset = await db.asset.create({
      data: {
        plantId,
        familyId: family.id,
        assetClassId: assetClass.id,
        code: `E2E-ASSET-${Date.now().toString(36).toUpperCase()}`,
        sequence: 1,
        nameTh: "เครื่องจักรสำหรับทดสอบ PM",
        nameEn: "PM release test asset",
      },
    });
  }
  assetId = asset.id;
  const technician = await db.user.findUniqueOrThrow({ where: { username: "tech-electrical" } });
  technicianId = technician.id;
  await db.userPermissionOverride.upsert({
    where: { userId_permissionKey: { userId: technician.id, permissionKey: "execute_pm_work" } },
    update: { decision: "ALLOW", grantedById: actor.id },
    create: { userId: technician.id, permissionKey: "execute_pm_work", decision: "ALLOW", grantedById: actor.id },
  });
  const eligible = await listEligiblePmAssignees(actor, { organizationId, plantId });
  if (!eligible.some((user) => user.id === technicianId)) throw new Error("E2E technician is not an eligible PM assignee");
  const stamp = `${Date.now().toString(36)}-${process.pid}`;
  const group = await createPmGroup(actor, {
    organizationId,
    plantId,
    code: `E2EWF-${stamp}`,
    name: "Playwright complete workflow",
    assetIds: [assetId],
  });
  let day = 1;
  while (!planId && day <= 28) {
    const candidateDateKey = `2035-12-${String(day).padStart(2, "0")}`;
    try {
      const plan = await createOrGetDraftPmPlan(actor, {
        organizationId,
        plantId,
        plannedDateKey: candidateDateKey,
        submissionKey: `e2e-pm-${stamp}`,
      });
      planId = plan.id;
      plannedDateKey = candidateDateKey;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("occupies")) throw error;
      day += 1;
    }
  }
  if (!planId) throw new Error("No free PM release-test date was found");
  await addDraftPmGroup(actor, { organizationId, plantId, planId, groupId: group.id });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("service-prepared group and draft continue through UI confirm, assign, execute, correct, asset history and PM-CM link", async ({ page }, testInfo) => {
  const browserErrors = captureBrowserErrors(page);
  await login(page, "site-admin");
  await page.goto(`/dashboardpm?organizationId=${organizationId}&plantId=${plantId}&planId=${planId}&date=${plannedDateKey}&month=2035-12`);
  await expect(page.getByText(/Asset Preview · 1 รายการ/)).toBeVisible();
  await page.getByRole("button", { name: "ยืนยันแผน PM" }).click();
  await page.getByRole("button", { name: "ยืนยันและสร้างงาน" }).click();
  await expect(page).toHaveURL(/saved=confirmed/);
  const work = await db.pmWork.findFirstOrThrow({ where: { pmPlanId: planId } });
  workId = work.id;

  await page.goto(`/dashboardpm/work/${workId}?organizationId=${organizationId}&plantId=${plantId}`);
  await page.getByLabel("Lead performer").selectOption(technicianId);
  await page.getByRole("button", { name: "Save assignment" }).click();
  await expect(page.getByRole("status")).toContainText("PM work updated");

  await login(page, "tech-electrical");
  await page.goto(`/dashboardpm/work/${workId}`);
  await page.getByRole("button", { name: "Start PM" }).click();
  await expect(page.getByText("IN_PROGRESS", { exact: true })).toBeVisible();
  await page.getByLabel("PM result").selectOption("ABNORMAL");
  await page.locator('textarea[name="note"]').fill("E2E vibration outside normal range");
  await page.getByRole("button", { name: "Complete PM" }).click();
  await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();

  const cmForm = page.getByRole("heading", { name: "สร้างงาน CM จากผล PM" });
  await expect(cmForm).toBeVisible();
  await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
  await page.locator('select[name="zoneId"]').selectOption({ index: 1 });
  await page.getByRole("button", { name: "สร้างงาน CM" }).click();
  await expect(page.getByText("งาน CM ที่เชื่อมโยง")).toBeVisible({ timeout: 15_000 });
  const linkedCm = page.getByRole("link", { name: /CM-/ }).first();
  await expect(linkedCm).toBeVisible();
  linkedCmNumber = (await linkedCm.textContent())!.split(" · ")[0];

  await login(page, "site-admin");
  await page.goto(`/dashboardpm/work/${workId}?organizationId=${organizationId}&plantId=${plantId}`);
  await page.locator('textarea[name="note"]').fill("E2E confirmed abnormal reading");
  await page.locator('input[name="reason"]').last().fill("Release gate correction check");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(page.locator("p").filter({ hasText: "E2E confirmed abnormal reading" }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("pm-completed-work.png"), fullPage: true, caret: "initial" });
  await page.locator('textarea[name="note"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("pm-completed-work-viewport.png"), fullPage: false, caret: "initial" });

  await page.goto(`/assets/${assetId}?tab=maintenance`);
  await expect(page.getByRole("link", { name: work.number, exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: `CM ${linkedCmNumber} · NEW`, exact: true })).toBeVisible();
  const databaseWork = await db.pmWork.findUniqueOrThrow({ where: { id: workId }, include: { originatingCmWork: true } });
  expect(databaseWork.status).toBe("COMPLETED");
  expect(databaseWork.result).toBe("ABNORMAL");
  expect(databaseWork.originatingCmWork?.number).toBe(linkedCmNumber);
  expect(browserErrors).toEqual([]);
});
