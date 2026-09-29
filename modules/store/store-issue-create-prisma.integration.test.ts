import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import { StoreIssueType } from "./store-types";

let integrationDb: PrismaClient;
const mocks = vi.hoisted(() => ({ dispatchLineStoreEvent: vi.fn() }));

vi.mock("../../lib/db", () => ({ get db() { return integrationDb; } }));
vi.mock("../line/line-service", () => ({ dispatchLineStoreEvent: mocks.dispatchLineStoreEvent }));

describe("Store Issue create Prisma workflow", () => {
  const fixture = `store-issue-create-${Date.now()}`;
  const tempDirectory = mkdtempSync(join(tmpdir(), "store-issue-create-"));
  const databasePath = join(tempDirectory, "create.db");
  const ids = {
    organizationId: `${fixture}-org`,
    plantId: `${fixture}-plant`,
    userId: `${fixture}-user`,
    storeId: `${fixture}-store`,
    categoryId: `${fixture}-category`,
    groupId: `${fixture}-group`,
    typeId: `${fixture}-type`,
    sparePartId: `${fixture}-part`,
    zoneId: `${fixture}-zone`,
  };
  const inventoryCode = "SIC";
  const scope = {
    organizationId: ids.organizationId,
    plantId: ids.plantId,
    plantCode: inventoryCode,
  };
  const actor = {
    id: ids.userId,
    role: RoleName.ADMIN,
    organizationId: ids.organizationId,
    plantId: ids.plantId,
    fullName: "Integration Owner",
    department: "Maintenance",
  };

  beforeAll(async () => {
    copyFileSync(resolve("prisma/dev.db"), databasePath);
    integrationDb = new PrismaClient({
      datasources: { db: { url: `file:${databasePath.replaceAll("\\", "/")}` } },
    });
    await integrationDb.organization.create({
      data: { id: ids.organizationId, slug: `${fixture}-slug`, name: "Store Issue Integration" },
    });
    await integrationDb.plant.create({
      data: {
        id: ids.plantId,
        organizationId: ids.organizationId,
        code: "SIC",
        inventoryCode,
        publicStoreIssueEnabled: true,
        name: "Store Issue Integration Site",
      },
    });
    await integrationDb.user.create({
      data: {
        id: ids.userId,
        username: `${fixture}-user`,
        passwordHash: "test-only",
        fullName: actor.fullName,
        department: actor.department,
        role: actor.role,
        organizationId: ids.organizationId,
        plantId: ids.plantId,
      },
    });
    await integrationDb.store.create({
      data: {
        id: ids.storeId,
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        code: "MAIN",
        name: "Main Store",
      },
    });
    await integrationDb.sparePartCategory.create({
      data: {
        id: ids.categoryId,
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        code: "CAT",
        name: "Integration Category",
      },
    });
    await integrationDb.sparePartMaterialGroup.create({
      data: {
        id: ids.groupId,
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        categoryId: ids.categoryId,
        code: "GRP",
        name: "Integration Group",
      },
    });
    await integrationDb.sparePartType.create({
      data: {
        id: ids.typeId,
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        code: "TYP",
        name: "Integration Type",
      },
    });
    await integrationDb.sparePart.create({
      data: {
        id: ids.sparePartId,
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        code: "SP-SIC-00001",
        itemCode: "ITEM001",
        name: "Integration Part",
        unit: "PCS",
        categoryId: ids.categoryId,
        materialGroupId: ids.groupId,
        typeId: ids.typeId,
        defaultStoreId: ids.storeId,
      },
    });
    await integrationDb.zone.create({
      data: { id: ids.zoneId, plantId: ids.plantId, name: "Integration Zone" },
    });
    await integrationDb.storeApplicableZone.create({
      data: {
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        zoneId: ids.zoneId,
        code: "01",
      },
    });
    await integrationDb.storeStock.create({
      data: {
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        storeId: ids.storeId,
        sparePartId: ids.sparePartId,
        quantity: 10,
      },
    });
  });

  beforeEach(async () => {
    await integrationDb.auditEvent.deleteMany({ where: { entityType: "SparePartIssue" } });
    await integrationDb.sparePartIssue.deleteMany({ where: { plantId: ids.plantId } });
    await integrationDb.storeIssueSequence.deleteMany({ where: { plantId: ids.plantId } });
    mocks.dispatchLineStoreEvent.mockReset();
  });

  afterAll(async () => {
    await integrationDb?.$disconnect();
    rmSync(tempDirectory, { recursive: true, force: true });
  });

  function input(submissionKey: string, overrides: Record<string, unknown> = {}) {
    return {
      submissionKey,
      issueType: StoreIssueType.DIRECT,
      requesterName: "Integration Requester",
      requesterDepartment: "Maintenance",
      requestedAt: new Date("2026-09-28T03:00:00.000Z"),
      items: [{
        storeId: ids.storeId,
        sparePartId: ids.sparePartId,
        zoneId: ids.zoneId,
        requestedQty: 1,
      }],
      ...overrides,
    };
  }

  it("creates an Internal issue once and keeps its public result shape", async () => {
    const { createLoggedInStoreIssue } = await import("./store-issue-create-prisma");
    const first = await createLoggedInStoreIssue(actor, scope, input(`${fixture}-internal`));
    const duplicate = await createLoggedInStoreIssue(actor, scope, input(`${fixture}-internal`));

    expect(first).toEqual({ id: expect.any(String), number: expect.stringContaining(inventoryCode) });
    expect(duplicate).toEqual(first);
    expect("plantId" in first).toBe(false);
    expect(await integrationDb.sparePartIssue.count({ where: { plantId: ids.plantId } })).toBe(1);
    expect(await integrationDb.auditEvent.count({ where: { entityId: first.id } })).toBe(1);
    expect(mocks.dispatchLineStoreEvent).toHaveBeenCalledTimes(1);
  });

  it("creates a Public issue with plantId and no requester user", async () => {
    const { createPublicStoreIssue } = await import("./store-issue-create-prisma");
    const created = await createPublicStoreIssue(
      inventoryCode.toLowerCase(),
      input(`${fixture}-public`),
    );
    const stored = await integrationDb.sparePartIssue.findUniqueOrThrow({
      where: { id: created.id },
      select: { plantId: true, requesterUserId: true, requesterDepartment: true },
    });

    expect(created).toEqual({
      id: expect.any(String),
      number: expect.stringContaining(inventoryCode),
      plantId: ids.plantId,
    });
    expect(stored).toEqual({
      plantId: ids.plantId,
      requesterUserId: null,
      requesterDepartment: "Maintenance",
    });
    expect(mocks.dispatchLineStoreEvent).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent Public submissions and dispatches one event", async () => {
    const { createPublicStoreIssue } = await import("./store-issue-create-prisma");
    const submission = input(`${fixture}-concurrent`);
    const [first, second] = await Promise.all([
      createPublicStoreIssue(inventoryCode, submission),
      createPublicStoreIssue(inventoryCode, submission),
    ]);

    expect(second).toEqual(first);
    expect(await integrationDb.sparePartIssue.count({
      where: { submissionKey: `${fixture}-concurrent` },
    })).toBe(1);
    expect(mocks.dispatchLineStoreEvent).toHaveBeenCalledTimes(1);
  });

  it("preserves Public Site errors before issue-type validation", async () => {
    const { createPublicStoreIssue } = await import("./store-issue-create-prisma");
    await expect(createPublicStoreIssue(
      "missing-site",
      input(`${fixture}-missing-site`, { issueType: "INVALID" }),
    )).rejects.toThrow("Public Store Issue is not available for this Site.");
  });

  it("preserves Internal issue-type validation before Plant lookup", async () => {
    const { createLoggedInStoreIssue } = await import("./store-issue-create-prisma");
    await expect(createLoggedInStoreIssue(
      actor,
      { ...scope, plantId: "missing-plant" },
      input(`${fixture}-invalid-type`, { issueType: "INVALID" }),
    )).rejects.toThrow("Store issue type is invalid.");
  });

  it("rejects Store items outside the selected Site scope", async () => {
    const { createLoggedInStoreIssue } = await import("./store-issue-create-prisma");
    await expect(createLoggedInStoreIssue(
      actor,
      scope,
      input(`${fixture}-bad-store`, {
        items: [{
          storeId: "outside-store",
          sparePartId: ids.sparePartId,
          zoneId: ids.zoneId,
          requestedQty: 1,
        }],
      }),
    )).rejects.toThrow("Selected spare part is not available in the selected Store for this Site.");
  });
});
