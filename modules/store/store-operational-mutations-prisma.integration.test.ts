import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

let integrationDb: PrismaClient;
vi.mock("../../lib/db", () => ({
  get db() {
    return integrationDb;
  },
}));

describe("Store operational mutation transactions", () => {
  const fixture = `store-operational-${Date.now()}`;
  const tempDirectory = mkdtempSync(join(tmpdir(), "store-operational-"));
  const databasePath = join(tempDirectory, "rollback.db");
  const ids = {
    organizationId: `${fixture}-org`,
    plantId: `${fixture}-plant`,
    userId: `${fixture}-user`,
    storeId: `${fixture}-store`,
    categoryId: `${fixture}-category`,
    groupId: `${fixture}-group`,
    typeId: `${fixture}-type`,
    sparePartId: `${fixture}-part`,
  };
  const scope = {
    organizationId: ids.organizationId,
    plantId: ids.plantId,
    plantCode: "OPH",
  };
  const actor = {
    id: ids.userId,
    role: RoleName.ADMIN,
    organizationId: ids.organizationId,
    plantId: ids.plantId,
  };

  beforeAll(async () => {
    copyFileSync(resolve("prisma/dev.db"), databasePath);
    integrationDb = new PrismaClient({
      datasources: {
        db: { url: `file:${databasePath.replaceAll("\\", "/")}` },
      },
    });
    await integrationDb.organization.create({
      data: {
        id: ids.organizationId,
        slug: `${fixture}-slug`,
        name: "Store Operational Integration",
      },
    });
    await integrationDb.plant.create({
      data: {
        id: ids.plantId,
        organizationId: ids.organizationId,
        code: "OPH",
        inventoryCode: "OPH",
        name: "Store Operational Integration Site",
      },
    });
    await integrationDb.user.create({
      data: {
        id: ids.userId,
        username: `${fixture}-user`,
        passwordHash: "test-only",
        fullName: "Store Administrator",
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
        name: "Operational Category",
      },
    });
    await integrationDb.sparePartMaterialGroup.create({
      data: {
        id: ids.groupId,
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        categoryId: ids.categoryId,
        code: "GRP",
        name: "Operational Group",
      },
    });
    await integrationDb.sparePartType.create({
      data: {
        id: ids.typeId,
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        code: "TYP",
        name: "Operational Type",
      },
    });
    await integrationDb.sparePart.create({
      data: {
        id: ids.sparePartId,
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        code: "SP-OPH-00001",
        itemCode: "ITEM001",
        name: "Operational Part",
        unit: "PCS",
        categoryId: ids.categoryId,
        materialGroupId: ids.groupId,
        typeId: ids.typeId,
        defaultStoreId: ids.storeId,
        latestUnitPrice: 50,
      },
    });
    await integrationDb.storeStock.create({
      data: {
        organizationId: ids.organizationId,
        plantId: ids.plantId,
        storeId: ids.storeId,
        sparePartId: ids.sparePartId,
        quantity: 5,
      },
    });
  });

  beforeEach(async () => {
    await integrationDb.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS "fail-store-receive-audit"',
    );
    await integrationDb.auditEvent.deleteMany({
      where: { action: "RECEIVE_SPARE_PART_STOCK" },
    });
    await integrationDb.stockMovement.deleteMany({
      where: { sparePartId: ids.sparePartId },
    });
    await integrationDb.sparePartReceive.deleteMany({
      where: { plantId: ids.plantId },
    });
    await integrationDb.storeStock.update({
      where: {
        storeId_sparePartId: {
          storeId: ids.storeId,
          sparePartId: ids.sparePartId,
        },
      },
      data: { quantity: 5 },
    });
    await integrationDb.sparePart.update({
      where: { id: ids.sparePartId },
      data: { latestUnitPrice: 50 },
    });
  });

  afterAll(async () => {
    await integrationDb?.$disconnect();
    rmSync(tempDirectory, { recursive: true, force: true });
  });

  it("rolls back Receive, Stock, price, and Movement when Audit fails", async () => {
    await integrationDb.$executeRawUnsafe(
      `CREATE TRIGGER "fail-store-receive-audit"
       BEFORE INSERT ON "AuditEvent"
       WHEN NEW."action" = 'RECEIVE_SPARE_PART_STOCK'
       BEGIN
         SELECT RAISE(ABORT, 'injected receive audit failure');
       END`,
    );
    const { receiveStock } = await import("./store-receive-prisma");

    await expect(
      receiveStock(actor, scope, {
        receivedAt: new Date("2026-09-28T03:00:00.000Z"),
        referenceNo: "PO-ROLLBACK",
        items: [
          {
            storeId: ids.storeId,
            sparePartId: ids.sparePartId,
            quantity: 2,
            unitPrice: 99,
          },
        ],
      }),
    ).rejects.toThrow();

    const [stock, sparePart, receiveCount, movementCount, auditCount] =
      await Promise.all([
        integrationDb.storeStock.findUniqueOrThrow({
          where: {
            storeId_sparePartId: {
              storeId: ids.storeId,
              sparePartId: ids.sparePartId,
            },
          },
        }),
        integrationDb.sparePart.findUniqueOrThrow({
          where: { id: ids.sparePartId },
        }),
        integrationDb.sparePartReceive.count({
          where: { plantId: ids.plantId },
        }),
        integrationDb.stockMovement.count({
          where: { sparePartId: ids.sparePartId },
        }),
        integrationDb.auditEvent.count({
          where: {
            action: "RECEIVE_SPARE_PART_STOCK",
            plantId: ids.plantId,
          },
        }),
      ]);

    expect(Number(stock.quantity)).toBe(5);
    expect(Number(sparePart.latestUnitPrice)).toBe(50);
    expect(receiveCount).toBe(0);
    expect(movementCount).toBe(0);
    expect(auditCount).toBe(0);
  });
});
