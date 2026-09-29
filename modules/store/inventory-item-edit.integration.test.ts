import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionKey } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";

let integrationDb: PrismaClient;
vi.mock("../../lib/db", () => ({ get db() { return integrationDb; } }));

describe("Inventory Item edit transaction", () => {
  const fixture = `inventory-item-edit-${Date.now()}`;
  const tempDirectory = mkdtempSync(join(tmpdir(), "inventory-item-edit-"));
  const databasePath = join(tempDirectory, "rollback.db");
  const ids = {
    organizationId: `${fixture}-org`, plantId: `${fixture}-site`, userId: `${fixture}-user`,
    storeId: `${fixture}-store`, categoryId: `${fixture}-category`, groupId: `${fixture}-group`,
    typeId: `${fixture}-type`, sparePartId: `${fixture}-part`,
  };
  const scope = { organizationId: ids.organizationId, plantId: ids.plantId, plantCode: "IED" };
  const actor = {
    id: ids.userId,
    role: RoleName.STORE_OFFICER,
    organizationId: ids.organizationId,
    plantId: ids.plantId,
    inventoryScopes: [{ itemKind: "SPARE_PART", responsibilityEnabled: true }],
  };
  const input = {
    itemKind: "SPARE_PART", name: "Updated seal", itemCode: "SEAL-001", description: "Updated",
    unit: "PCS", categoryId: ids.categoryId, materialGroupId: ids.groupId, typeId: ids.typeId,
    defaultStoreId: ids.storeId, minStock: 2, maxStock: 20, reorderPoint: 5, latestUnitPrice: 999, active: true,
  };

  beforeAll(async () => {
    copyFileSync(resolve("prisma/dev.db"), databasePath);
    integrationDb = new PrismaClient({ datasources: { db: { url: `file:${databasePath.replaceAll("\\", "/")}` } } });
    await integrationDb.organization.create({ data: { id: ids.organizationId, slug: `${fixture}-slug`, name: "Inventory Item Edit Organization" } });
    await integrationDb.plant.create({ data: { id: ids.plantId, organizationId: ids.organizationId, code: "IED", inventoryCode: `I${Date.now().toString().slice(-6)}`, name: "Inventory Item Edit Site" } });
    await integrationDb.user.create({ data: { id: ids.userId, username: `${fixture}-user`, passwordHash: "test-only", fullName: "Store Officer", role: RoleName.STORE_OFFICER, organizationId: ids.organizationId, plantId: ids.plantId } });
    await integrationDb.store.create({ data: { id: ids.storeId, organizationId: ids.organizationId, plantId: ids.plantId, code: "MAIN", name: "Main Store" } });
    await integrationDb.sparePartCategory.create({ data: { id: ids.categoryId, organizationId: ids.organizationId, plantId: ids.plantId, code: "SEA", name: "Seals" } });
    await integrationDb.sparePartMaterialGroup.create({ data: { id: ids.groupId, organizationId: ids.organizationId, plantId: ids.plantId, categoryId: ids.categoryId, code: "MSE", name: "Mechanical Seals" } });
    await integrationDb.sparePartType.create({ data: { id: ids.typeId, organizationId: ids.organizationId, plantId: ids.plantId, code: "EXP", name: "Expense" } });
    await integrationDb.sparePart.create({ data: { id: ids.sparePartId, organizationId: ids.organizationId, plantId: ids.plantId, code: "SP-IED-00001", itemCode: "SEAL-001", name: "Original seal", unit: "PCS", categoryId: ids.categoryId, materialGroupId: ids.groupId, typeId: ids.typeId, defaultStoreId: ids.storeId, latestUnitPrice: 450 } });
  });

  beforeEach(async () => {
    await integrationDb.$executeRawUnsafe('DROP TRIGGER IF EXISTS "fail-inventory-item-audit"');
    await integrationDb.auditEvent.deleteMany({ where: { entityId: ids.sparePartId } });
    await integrationDb.sparePart.update({ where: { id: ids.sparePartId }, data: { name: "Original seal", latestUnitPrice: 450 } });
  });

  afterAll(async () => {
    await integrationDb?.$disconnect();
    rmSync(tempDirectory, { recursive: true, force: true });
  });

  it("preserves the stored price when Stock Value Access is denied", async () => {
    const { updateSparePart } = await import("./store-prisma-service");
    await updateSparePart({
      ...actor,
      userPermissionOverrides: [{ userId: ids.userId, permissionKey: PermissionKey.VIEW_STOCK_VALUE, decision: "DENY" }],
    }, scope, ids.sparePartId, input);

    const stored = await integrationDb.sparePart.findUniqueOrThrow({ where: { id: ids.sparePartId } });
    expect(stored.name).toBe("Updated seal");
    expect(Number(stored.latestUnitPrice)).toBe(450);
    expect(await integrationDb.auditEvent.count({ where: { entityId: ids.sparePartId, action: "UPDATE_SPARE_PART" } })).toBe(1);
  });

  it("rolls back the Inventory Item when its Audit write fails", async () => {
    await integrationDb.$executeRawUnsafe(`CREATE TRIGGER "fail-inventory-item-audit" BEFORE INSERT ON "AuditEvent" WHEN NEW."action" = 'UPDATE_SPARE_PART' BEGIN SELECT RAISE(ABORT, 'injected inventory audit failure'); END`);
    const { updateSparePart } = await import("./store-prisma-service");

    await expect(updateSparePart(actor, scope, ids.sparePartId, input)).rejects.toThrow();

    const stored = await integrationDb.sparePart.findUniqueOrThrow({ where: { id: ids.sparePartId } });
    expect(stored.name).toBe("Original seal");
    expect(Number(stored.latestUnitPrice)).toBe(450);
    expect(await integrationDb.auditEvent.count({ where: { entityId: ids.sparePartId } })).toBe(0);
  });
});
