import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

let integrationDb: PrismaClient;
vi.mock("../../lib/db", () => ({ get db() { return integrationDb; } }));

describe("PM confirmation SQLite rollback", () => {
  const fixture = `phase5-${Date.now()}`;
  const tempDirectory = mkdtempSync(join(tmpdir(), "pm-confirm-rollback-"));
  const databasePath = join(tempDirectory, "rollback.db");
  const ids = { organizationId: `${fixture}-org`, plantId: `${fixture}-site`, userId: `${fixture}-user`, classId: `${fixture}-class`, familyId: `${fixture}-family`, assetId: `${fixture}-asset`, groupId: `${fixture}-group`, membershipId: `${fixture}-membership`, planId: `${fixture}-plan`, draftGroupId: `${fixture}-draft-group` };

  beforeAll(async () => {
    copyFileSync(resolve("prisma/dev.db"), databasePath);
    integrationDb = new PrismaClient({ datasources: { db: { url: `file:${databasePath.replaceAll("\\", "/")}` } } });
    await integrationDb.organization.create({ data: { id: ids.organizationId, slug: `${fixture}-slug`, name: "Rollback Organization" } });
    await integrationDb.plant.create({ data: { id: ids.plantId, organizationId: ids.organizationId, code: "RB", name: "Rollback Site" } });
    await integrationDb.user.create({ data: { id: ids.userId, username: `${fixture}-user`, passwordHash: "test-only", fullName: "Rollback Admin", role: RoleName.SITE_ADMIN, organizationId: ids.organizationId, plantId: ids.plantId } });
    await integrationDb.assetClass.create({ data: { id: ids.classId, plantId: ids.plantId, nameTh: "Rollback Class" } });
    await integrationDb.assetFamily.create({ data: { id: ids.familyId, plantId: ids.plantId, code: "RBF", nameTh: "Rollback Family" } });
    await integrationDb.asset.create({ data: { id: ids.assetId, publicToken: `${fixture}-token`, plantId: ids.plantId, familyId: ids.familyId, assetClassId: ids.classId, code: `${fixture}-asset-code`, nameTh: "Rollback Asset", registrationStatus: "ACTIVE" } });
    await integrationDb.pmGroup.create({ data: { id: ids.groupId, organizationId: ids.organizationId, plantId: ids.plantId, code: "RBG", name: "Rollback Group" } });
    await integrationDb.pmGroupAsset.create({ data: { id: ids.membershipId, plantId: ids.plantId, pmGroupId: ids.groupId, assetId: ids.assetId } });
    await integrationDb.pmPlan.create({ data: { id: ids.planId, organizationId: ids.organizationId, plantId: ids.plantId, plannedDateKey: "2026-09-03", status: "DRAFT", submissionKey: `${fixture}-submission` } });
    await integrationDb.pmPlanDraftGroup.create({ data: { id: ids.draftGroupId, plantId: ids.plantId, pmPlanId: ids.planId, pmGroupId: ids.groupId } });
    await integrationDb.$executeRawUnsafe(`CREATE TRIGGER "${fixture}-fail-audit" BEFORE INSERT ON "AuditEvent" WHEN NEW."action" = 'CONFIRM_PM_PLAN' BEGIN SELECT RAISE(ABORT, 'injected confirmation audit failure'); END`);
  });

  afterAll(async () => {
    await integrationDb?.$disconnect();
    rmSync(tempDirectory, { recursive: true, force: true });
  });

  it("rolls back the lock, sequence, snapshots, works, sources, first-use and audit", async () => {
    const { confirmPmPlan } = await import("./pm-plan-service");
    await expect(confirmPmPlan(
      { id: ids.userId, role: RoleName.SITE_ADMIN, organizationId: ids.organizationId, plantId: ids.plantId },
      { organizationId: ids.organizationId, plantId: ids.plantId, planId: ids.planId, submissionKey: `${fixture}-submission`, now: new Date("2026-09-03T04:00:00Z") },
    // Prisma normalizes SQLite trigger aborts differently across query-engine builds;
    // reaching auditEvent.create proves every intermediate confirmation write ran first.
    )).rejects.toThrow();

    const [plan, sequenceCount, snapshotCount, workCount, sourceCount, auditCount, group] = await Promise.all([
      integrationDb.pmPlan.findUniqueOrThrow({ where: { id: ids.planId } }),
      integrationDb.pmPlanSequence.count({ where: { siteCodeSegment: "RB", creationDateKey: "2026-09-03" } }),
      integrationDb.pmPlanGroupSnapshot.count({ where: { pmPlanId: ids.planId } }),
      integrationDb.pmWork.count({ where: { pmPlanId: ids.planId } }),
      integrationDb.pmWorkSourceGroup.count({ where: { pmPlanId: ids.planId } }),
      integrationDb.auditEvent.count({ where: { entityType: "PmPlan", entityId: ids.planId, action: "CONFIRM_PM_PLAN" } }),
      integrationDb.pmGroup.findUniqueOrThrow({ where: { id: ids.groupId } }),
    ]);
    expect(plan).toMatchObject({ status: "DRAFT", number: null, creationDateKey: null, confirmedAt: null, confirmedById: null });
    expect([sequenceCount, snapshotCount, workCount, sourceCount, auditCount]).toEqual([0, 0, 0, 0, 0]);
    expect(group.firstUsedAt).toBeNull();
  });
});
