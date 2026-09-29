import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const mocks = vi.hoisted(() => {
  const tx = {
    plant: { findFirstOrThrow: vi.fn() },
    auditEvent: { create: vi.fn() },
    store: { count: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    sparePartType: { findMany: vi.fn() },
    sparePartCategory: { findMany: vi.fn() },
    sparePartMaterialGroup: { findMany: vi.fn() },
    sparePart: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    sparePartReceive: { create: vi.fn() },
    sparePartSequence: { upsert: vi.fn() },
    storeStock: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    stockMovement: { create: vi.fn() },
  };
  return {
    tx,
    db: {
      $transaction: vi.fn(async (run: (client: typeof tx) => unknown) =>
        run(tx),
      ),
    },
    parseWorkbook: vi.fn(),
    validateRows: vi.fn(),
  };
});

vi.mock("../../lib/db", () => ({ db: mocks.db }));
vi.mock("./spare-part-excel-import", () => ({
  parseSparePartImportWorkbook: mocks.parseWorkbook,
  validateSparePartImportRows: mocks.validateRows,
}));

const actor = { id: "admin", role: RoleName.ADMIN };
const scope = { organizationId: "org", plantId: "site", plantCode: "RTB" };

describe("Store operational mutation adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site" });
    mocks.tx.auditEvent.create.mockResolvedValue({ id: "audit" });
    mocks.tx.store.count.mockResolvedValue(1);
    mocks.tx.store.findFirst.mockResolvedValue({ id: "store" });
    mocks.tx.sparePart.count.mockResolvedValue(1);
    mocks.tx.sparePart.findMany.mockResolvedValue([{ itemKind: "SPARE_PART" }]);
    mocks.tx.sparePart.findFirst.mockResolvedValue({ id: "part" });
    mocks.tx.sparePart.findFirstOrThrow.mockResolvedValue({
      itemKind: "SPARE_PART",
    });
    mocks.tx.sparePartReceive.create.mockResolvedValue({ id: "receive" });
    mocks.tx.storeStock.upsert.mockResolvedValue({ quantity: 3 });
    mocks.tx.storeStock.findUnique.mockResolvedValue({ quantity: 5 });
    mocks.tx.storeStock.findUniqueOrThrow.mockResolvedValue({ quantity: 7 });
    mocks.tx.storeStock.updateMany.mockResolvedValue({ count: 1 });
  });

  it("keeps Receive, Stock, Movement, and Audit in one transaction", async () => {
    const { receiveStock } = await import("./store-receive-prisma");

    await expect(
      receiveStock(actor, scope, {
        receivedAt: new Date("2026-09-28T01:00:00.000Z"),
        referenceNo: "PO-001",
        items: [
          {
            storeId: "store",
            sparePartId: "part",
            quantity: 3,
            unitPrice: 100,
          },
        ],
      }),
    ).resolves.toEqual({ id: "receive" });

    expect(mocks.tx.sparePartReceive.create).toHaveBeenCalledOnce();
    expect(mocks.tx.storeStock.upsert).toHaveBeenCalledOnce();
    expect(mocks.tx.stockMovement.create).toHaveBeenCalledOnce();
    expect(mocks.tx.auditEvent.create).toHaveBeenCalledOnce();
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
  });

  it("checks Organization and Site before reading Receive item kinds", async () => {
    mocks.tx.plant.findFirstOrThrow.mockRejectedValue(
      new Error("scope mismatch"),
    );
    const { receiveStock } = await import("./store-receive-prisma");

    await expect(
      receiveStock(actor, scope, {
        receivedAt: new Date(),
        items: [{ storeId: "store", sparePartId: "part", quantity: 1 }],
      }),
    ).rejects.toThrow("scope mismatch");
    expect(mocks.tx.sparePart.findMany).not.toHaveBeenCalled();
  });

  it("keeps Adjustment, Movement, and Audit in one transaction", async () => {
    const { adjustStock } = await import("./store-adjustment-prisma");

    await expect(
      adjustStock(actor, scope, {
        storeId: "store",
        sparePartId: "part",
        quantityChange: 2,
        reason: "Cycle count",
        occurredAt: new Date("2026-09-28T02:00:00.000Z"),
      }),
    ).resolves.toEqual({ balanceAfter: 7 });

    expect(mocks.tx.sparePart.findFirstOrThrow).toHaveBeenCalledOnce();
    expect(mocks.tx.storeStock.upsert).toHaveBeenCalledOnce();
    expect(mocks.tx.stockMovement.create).toHaveBeenCalledOnce();
    expect(mocks.tx.auditEvent.create).toHaveBeenCalledOnce();
  });

  it("propagates audit failure from an operational transaction", async () => {
    mocks.tx.auditEvent.create.mockRejectedValue(new Error("audit failed"));
    const { adjustStock } = await import("./store-adjustment-prisma");

    await expect(
      adjustStock(actor, scope, {
        storeId: "store",
        sparePartId: "part",
        quantityChange: 2,
        reason: "Cycle count",
        occurredAt: new Date(),
      }),
    ).rejects.toThrow("audit failed");
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
  });

  it("validates Excel master data and writes import records in one transaction", async () => {
    const parsedRow = { rowNumber: 2, itemCode: "ITEM-001" };
    const validatedRow = {
      ...parsedRow,
      name: "Seal",
      description: null,
      unit: "PCS",
      storeCode: "MAIN",
      typeCode: "MECH",
      categoryCode: "SEAL",
      materialGroupCode: "",
      minStock: 1,
      maxStock: 10,
      reorderPoint: 2,
      latestUnitPrice: 100,
      openingQuantity: 4,
      active: true,
      storeId: "store",
      typeId: "type",
      categoryId: "category",
      materialGroupId: null,
    };
    mocks.parseWorkbook.mockReturnValue([parsedRow]);
    mocks.validateRows.mockReturnValue([validatedRow]);
    mocks.tx.store.findMany.mockResolvedValue([{ id: "store", code: "MAIN" }]);
    mocks.tx.sparePartType.findMany.mockResolvedValue([
      { id: "type", code: "MECH" },
    ]);
    mocks.tx.sparePartCategory.findMany.mockResolvedValue([
      { id: "category", code: "SEAL" },
    ]);
    mocks.tx.sparePartMaterialGroup.findMany.mockResolvedValue([]);
    mocks.tx.sparePart.findMany.mockResolvedValue([]);
    mocks.tx.sparePartSequence.upsert.mockResolvedValue({ lastNumber: 1 });
    mocks.tx.sparePart.create.mockResolvedValue({ id: "part" });
    const file = new File([new Uint8Array([1])], "items.xlsx");
    const { importSparePartsFromExcel } =
      await import("./store-excel-import-prisma");

    await expect(
      importSparePartsFromExcel(actor, scope, file),
    ).resolves.toMatchObject({
      importedCount: 1,
    });
    expect(mocks.tx.store.findMany).toHaveBeenCalledOnce();
    expect(mocks.tx.sparePart.create).toHaveBeenCalledOnce();
    expect(mocks.tx.storeStock.create).toHaveBeenCalledOnce();
    expect(mocks.tx.stockMovement.create).toHaveBeenCalledOnce();
    expect(mocks.tx.auditEvent.create).toHaveBeenCalledOnce();
  });

  it("checks Excel import scope before reading Store master data", async () => {
    mocks.parseWorkbook.mockReturnValue([{ rowNumber: 2 }]);
    mocks.tx.plant.findFirstOrThrow.mockRejectedValue(
      new Error("scope mismatch"),
    );
    const file = new File([new Uint8Array([1])], "items.xlsx");
    const { importSparePartsFromExcel } =
      await import("./store-excel-import-prisma");

    await expect(importSparePartsFromExcel(actor, scope, file)).rejects.toThrow(
      "scope mismatch",
    );
    expect(mocks.tx.store.findMany).not.toHaveBeenCalled();
    expect(mocks.validateRows).not.toHaveBeenCalled();
  });
});
