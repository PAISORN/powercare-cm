import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionKey } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";

const mocks = vi.hoisted(() => {
  const tx = {
    plant: { findFirstOrThrow: vi.fn() },
    sparePart: {
      findFirstOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    sparePartCategory: { findFirst: vi.fn() },
    sparePartMaterialGroup: { findFirst: vi.fn() },
    sparePartType: { findFirst: vi.fn() },
    store: { findFirst: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
  return {
    tx,
    db: {
      $transaction: vi.fn(async (run: (client: typeof tx) => unknown) =>
        run(tx),
      ),
    },
  };
});

vi.mock("../../lib/db", () => ({ db: mocks.db }));

const scope = { organizationId: "org", plantId: "site", plantCode: "RTB" };
const baseActor = {
  id: "officer",
  role: RoleName.STORE_OFFICER,
  organizationId: "org",
  plantId: "site",
  inventoryScopes: [{ itemKind: "SPARE_PART", responsibilityEnabled: true }],
};
const input = {
  itemKind: "SPARE_PART",
  name: "Mechanical seal",
  itemCode: "SEAL-001",
  description: "",
  unit: "PCS",
  categoryId: "category",
  materialGroupId: "group",
  typeId: "type",
  defaultStoreId: "store",
  minStock: 1,
  maxStock: 10,
  reorderPoint: 2,
  latestUnitPrice: 999,
  active: true,
};

describe("updateSparePart Stock Value policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site" });
    mocks.tx.sparePart.findFirstOrThrow.mockResolvedValue({
      id: "part",
      itemKind: "SPARE_PART",
      categoryId: "category",
      materialGroupId: "group",
      typeId: "type",
      defaultStoreId: "store",
      latestUnitPrice: 450,
    });
    mocks.tx.sparePart.findFirst.mockResolvedValue(null);
    mocks.tx.sparePartCategory.findFirst.mockResolvedValue({ id: "category" });
    mocks.tx.sparePartMaterialGroup.findFirst.mockResolvedValue({
      id: "group",
    });
    mocks.tx.sparePartType.findFirst.mockResolvedValue({ id: "type" });
    mocks.tx.store.findFirst.mockResolvedValue({ id: "store" });
    mocks.tx.sparePart.update.mockResolvedValue({
      id: "part",
      code: "SP-RTB-00001",
      name: "Mechanical seal",
    });
    mocks.tx.auditEvent.create.mockResolvedValue({ id: "audit" });
  });

  it("preserves the stored price when Stock Value Access is denied", async () => {
    const { updateSparePart } = await import("./store-prisma-service");
    const actor = {
      ...baseActor,
      userPermissionOverrides: [
        {
          userId: "officer",
          permissionKey: PermissionKey.VIEW_STOCK_VALUE,
          decision: "DENY",
        },
      ],
    };

    await updateSparePart(actor, scope, "part", input);

    expect(mocks.tx.sparePart.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ latestUnitPrice: 450 }),
      }),
    );
  });

  it("accepts a submitted price when Stock Value Access is allowed", async () => {
    const { updateSparePart } = await import("./store-prisma-service");

    await updateSparePart(baseActor, scope, "part", input);

    expect(mocks.tx.sparePart.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ latestUnitPrice: 999 }),
      }),
    );
    expect(mocks.tx.auditEvent.create).toHaveBeenCalledTimes(1);
  });

  it("keeps the mutation and audit write in the same transaction callback", async () => {
    const { updateSparePart } = await import("./store-prisma-service");
    mocks.tx.auditEvent.create.mockRejectedValueOnce(new Error("audit failed"));

    await expect(
      updateSparePart(baseActor, scope, "part", input),
    ).rejects.toThrow("audit failed");
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
  });
});
