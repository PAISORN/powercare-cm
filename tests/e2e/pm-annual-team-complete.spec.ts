import { expect, test, type Page } from "@playwright/test";
import { db } from "../../lib/db";

async function login(page: Page, username = "site-admin") {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill("password1234");
  await page.locator("form button").click();
  await expect(page).toHaveURL(/\/dashboardcm(?:\/|$)/);
}

function bangkokDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

test.afterAll(async () => {
  await db.$disconnect();
});

test("assigns an Annual PM team from the popup and renders Complete in pastel green", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const date = bangkokDateKey();
  const year = Number(date.slice(0, 4));
  const siteAdmin = await db.user.findUniqueOrThrow({
    where: { username: "site-admin" },
  });
  const unassignedTechnician = await db.user.findUniqueOrThrow({
    where: { username: "tech-mechanical" },
  });
  let asset = await db.asset.findFirst({
    where: {
      plantId: siteAdmin.plantId!,
      assetLevel: "MAIN_ASSET",
      registrationStatus: "ACTIVE",
      systemId: { not: null },
    },
    include: { system: true },
  });
  if (!asset) {
    const suffix = Date.now().toString(36);
    const system = await db.assetSystem.create({
      data: {
        plantId: siteAdmin.plantId!,
        code: `E2E-${suffix}`,
        nameTh: `Boiler E2E ${suffix}`,
      },
    });
    asset = await db.asset.create({
      data: {
        plantId: siteAdmin.plantId!,
        systemId: system.id,
        assetLevel: "MAIN_ASSET",
        code: `MA-E2E-${suffix}`,
        nameTh: `Main Asset E2E ${suffix}`,
        migrationStatus: "VERIFIED",
      },
      include: { system: true },
    });
  }
  let plan = await db.pmAnnualPlan.findFirst({
    where: {
      organizationId: siteAdmin.organizationId!,
      plantId: siteAdmin.plantId!,
      year,
      status: "ACTIVE",
      pmBy: "SYSTEM",
    },
  });
  if (!plan) {
    await db.pmAnnualPlan.updateMany({
      where: { plantId: siteAdmin.plantId!, year, status: "ACTIVE" },
      data: { status: "SUPERSEDED", activeKey: null },
    });
    plan = await db.pmAnnualPlan.create({
      data: {
        organizationId: siteAdmin.organizationId!,
        plantId: siteAdmin.plantId!,
        name: `Annual PM Team E2E ${Date.now()}`,
        year,
        pmBy: "SYSTEM",
        scheduleMode: "MANUAL",
        status: "ACTIVE",
        activeKey: `${siteAdmin.plantId}:${year}`,
        effectiveDateKey: date,
        createdById: siteAdmin.id,
        updatedById: siteAdmin.id,
        activatedAt: new Date(),
        activatedById: siteAdmin.id,
      },
    });
  }
  const schedule = await db.pmAnnualSchedule.create({
    data: {
      plantId: siteAdmin.plantId!,
      planId: plan.id,
      scheduleDateKey: date,
      assetSystemId: asset.systemId,
      source: "MANUAL",
      status: "SCHEDULED",
      slotKey: `${plan.id}:${date}:SYSTEM:${asset.systemId}:e2e-${Date.now()}`,
      recordedById: siteAdmin.id,
    },
  });

  const scope = new URLSearchParams({
    organizationId: siteAdmin.organizationId!,
    plantId: siteAdmin.plantId!,
    view: "month",
    month: date.slice(0, 7),
    date,
  });
  await login(page, "tech-mechanical");
  await page.goto(`/dashboardpm/calendar?${scope}`);
  const technicianTarget = page.getByRole("link", {
    name: new RegExp(`${asset.system!.nameTh} .*Main Assets`),
  }).first();
  const technicianDayCard = technicianTarget.locator(
    "xpath=ancestor::*[@data-pm-day-card]",
  );
  const technicianDayCardBox = await technicianDayCard.boundingBox();
  expect(technicianDayCardBox).not.toBeNull();
  await technicianDayCard.click({
    position: {
      x: Math.max(1, technicianDayCardBox!.width - 24),
      y: Math.max(1, technicianDayCardBox!.height - 18),
    },
  });
  await expect(page).toHaveURL(new RegExp(`scheduleId=${schedule.id}.*release=annual`));
  await expect(page.getByRole("dialog", { name: "เริ่มดำเนินการ PM" })).toBeVisible();
  await page.getByRole("button", { name: "เพิ่มผู้ร่วม PM" }).click();
  await expect(page.getByRole("dialog", { name: "เลือกผู้ร่วม PM" })).toBeVisible();
  await page.getByRole("button", { name: "ปิดหน้าต่างเลือกผู้ร่วม PM" }).last().click();
  await page.getByRole("link", { name: "ปิดหน้าต่างเริ่มดำเนินการ PM" }).click();

  await page.context().clearCookies();
  await login(page);
  await page.goto(`/dashboardpm/calendar?${scope}`);
  const targetLink = page.getByRole("link", {
    name: new RegExp(`${asset.system!.nameTh} .*Main Assets`),
  }).first();
  const dayCard = targetLink.locator("xpath=ancestor::*[@data-pm-day-card]");
  const dayCardBox = await dayCard.boundingBox();
  expect(dayCardBox).not.toBeNull();
  await dayCard.click({
    position: {
      x: Math.max(1, dayCardBox!.width - 24),
      y: Math.max(1, dayCardBox!.height - 18),
    },
  });
  await expect(page).toHaveURL(new RegExp(`scheduleId=${schedule.id}.*release=annual`));
  await expect(page.getByRole("dialog", { name: "เริ่มดำเนินการ PM" })).toBeVisible();
  await page.getByRole("button", { name: "เพิ่มผู้ร่วม PM" }).click();
  const teamDialog = page.getByRole("dialog", { name: "เลือกผู้ร่วม PM" });
  await expect(teamDialog).toBeVisible();
  await teamDialog.getByRole("checkbox", { name: /Electrical Engineer/ }).click();
  await expect(
    teamDialog.getByRole("combobox", { name: "ผู้รับผิดชอบหลัก" }),
  ).toHaveValue(/.+/);
  await teamDialog.getByRole("checkbox", { name: /Electrical Technician/ }).check();
  await teamDialog.screenshot({
    path: testInfo.outputPath("annual-pm-team-selector-desktop.png"),
    caret: "initial",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await teamDialog.evaluate((dialog) => ({
    dialog: dialog.getBoundingClientRect().toJSON(),
    viewport: window.innerWidth,
    offenders: [dialog, ...Array.from(dialog.querySelectorAll<HTMLElement>("*"))]
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        left: element.getBoundingClientRect().left,
        right: element.getBoundingClientRect().right,
        width: element.getBoundingClientRect().width,
      }))
      .filter((element) => element.left < 0 || element.right > window.innerWidth + 1)
      .slice(0, 10),
  }));
  expect(mobileLayout.dialog.left).toBeGreaterThanOrEqual(0);
  expect(
    mobileLayout.dialog.right,
    JSON.stringify(mobileLayout.offenders),
  ).toBeLessThanOrEqual(mobileLayout.viewport);
  expect(mobileLayout.offenders).toEqual([]);
  await teamDialog.screenshot({
    path: testInfo.outputPath("annual-pm-team-selector-mobile.png"),
    caret: "initial",
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await teamDialog.getByRole("button", { name: "ยืนยันทีม PM" }).click();
  await expect(page.getByRole("button", { name: "แก้ไขผู้ร่วม PM (2)" })).toBeVisible();
  await page.locator("[data-pm-annual-release-dialog]").screenshot({
    path: testInfo.outputPath("annual-pm-team-popup.png"),
    caret: "initial",
  });
  await page.getByRole("button", { name: "เริ่ม PM" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboardpm/annual/${schedule.id}`));

  const workSources = await db.pmAnnualWorkSource.findMany({
    where: { scheduleId: schedule.id },
    include: { pmWork: { include: { assignees: true } } },
  });
  expect(workSources.length).toBeGreaterThan(0);
  expect(
    workSources.every((source) => source.pmWork.assignees.length === 2),
  ).toBe(true);

  await page.context().clearCookies();
  await login(page, "tech-mechanical");
  await page.getByRole("button", { name: "PM", exact: true }).click();
  await expect(page.getByRole("link", { name: "PM Setup" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "PM Calendar" })).toBeVisible();
  await page.goto(
    `/dashboardpm/calendar?organizationId=${siteAdmin.organizationId}&plantId=${siteAdmin.plantId}&view=month&month=${date.slice(0, 7)}&date=${date}`,
  );
  await page
    .getByRole("link", { name: new RegExp(asset.system!.nameTh) })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/dashboardpm/annual/${schedule.id}`));
  await page
    .getByRole("link", { name: `เปิดใบงาน PM ของ ${asset.nameTh}` })
    .click();
  await page.getByRole("button", { name: "ส่งใบงาน / เสร็จสิ้น" }).click();
  await expect(page).toHaveURL(/saved=completed/);
  const successDialog = page.getByRole("dialog", { name: "ส่งใบงานเรียบร้อยแล้ว" });
  await expect(successDialog).toBeVisible();
  await expect(successDialog.locator("[data-pm-confetti]")).toHaveCount(24);
  await successDialog.screenshot({
    path: testInfo.outputPath("annual-pm-worksheet-success-popup.png"),
    caret: "initial",
  });
  await successDialog.getByRole("button", { name: /OK.*PM Main Assets/ }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboardpm/annual/${schedule.id}`));
  const completedAssetCard = page.getByRole("link", { name: `เปิดใบงาน PM ของ ${asset.nameTh}` });
  await expect(completedAssetCard).toContainText("ดำเนินการเสร็จสิ้น");
  await completedAssetCard.click();
  await expect(page.getByRole("link", { name: "แก้ไขใบงาน" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "เสร็จสิ้น (ปกติ)" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: /หมายเหตุเพิ่มเติม/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "บันทึกการแก้ไข" })).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("annual-pm-worksheet-readonly.png"),
    fullPage: true,
    caret: "initial",
  });
  await page.getByRole("link", { name: "แก้ไขใบงาน" }).click();
  await expect(page).toHaveURL(/edit=1/);
  await expect(page.getByRole("radio", { name: "เสร็จสิ้น (ปกติ)" })).toBeEnabled();
  await page.getByRole("radio", { name: "เสร็จสิ้น (พบปัญหา / แจ้งซ่อม)" }).check();
  await page.getByRole("textbox", { name: /หมายเหตุเพิ่มเติม/ }).fill("แก้ไขผลหลังตรวจซ้ำ");
  await page.getByRole("button", { name: "บันทึกการแก้ไข" }).click();
  await expect(page).toHaveURL(/saved=updated/);
  const updatedDialog = page.getByRole("dialog", { name: "บันทึกการแก้ไขแล้ว" });
  await expect(updatedDialog).toBeVisible();
  await updatedDialog.getByRole("button", { name: /OK.*PM Main Assets/ }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboardpm/annual/${schedule.id}`));
  const joinedWork = await db.pmWorkAssignee.findFirst({
    where: {
      userId: unassignedTechnician.id,
      pmWork: { annualSources: { some: { scheduleId: schedule.id } } },
    },
    include: { pmWork: true },
  });
  expect(joinedWork?.role).toBe("COLLABORATOR");
  expect(joinedWork?.pmWork.status).toBe("COMPLETED");
  expect(joinedWork?.pmWork.result).toBe("ABNORMAL");
  expect(joinedWork?.pmWork.resultNote).toBe("แก้ไขผลหลังตรวจซ้ำ");
  expect(joinedWork?.pmWork.correctedById).toBe(unassignedTechnician.id);

  const completedAssetWorks = await db.pmWork.findMany({
    where: { id: { in: workSources.map((source) => source.pmWorkId) } },
    select: { status: true },
  });
  expect(completedAssetWorks).toHaveLength(workSources.length);
  expect(completedAssetWorks.every((work) => work.status === "COMPLETED")).toBe(true);

  await page.goto(
    `/dashboardpm/calendar?organizationId=${siteAdmin.organizationId}&plantId=${siteAdmin.plantId}&view=month&month=${date.slice(0, 7)}&date=${date}`,
  );
  const completeTarget = page.getByRole("link", {
    name: new RegExp(`${asset.system!.nameTh} .*Complete`),
  });
  await expect(completeTarget).toBeVisible();
  await expect(completeTarget).toContainText("Complete");
  await expect(completeTarget).toHaveCSS("background-color", "rgb(220, 252, 231)");
  await page.screenshot({
    path: testInfo.outputPath("annual-pm-complete-calendar.png"),
    fullPage: true,
    caret: "initial",
  });
  expect(errors).toEqual([]);
});
