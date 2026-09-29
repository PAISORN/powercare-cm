import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const mocks = vi.hoisted(() => {
  const tx = {
    plant: { findFirstOrThrow: vi.fn() },
    auditEvent: { create: vi.fn() },
    sparePartCategory: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    sparePartMaterialGroup: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    sparePartType: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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

const actor = { id: "admin", role: RoleName.ADMIN };
const scope = { organizationId: "org", plantId: "site", plantCode: "RTB" };

describe("Store classification persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site" });
    mocks.tx.auditEvent.create.mockResolvedValue({ id: "audit" });
    mocks.tx.sparePartCategory.findFirst.mockResolvedValue(null);
    mocks.tx.sparePartMaterialGroup.findFirst.mockResolvedValue(null);
    mocks.tx.sparePartType.findFirst.mockResolvedValue(null);
  });

  it("creates a Material Group and audit record in one transaction", async () => {
    mocks.tx.sparePartCategory.findFirstOrThrow.mockResolvedValue({
      id: "category",
    });
    mocks.tx.sparePartMaterialGroup.create.mockResolvedValue({
      id: "group",
      categoryId: "category",
      code: "PIPE",
      name: "Pipe",
    });
    const { createSparePartMaterialGroup } =
      await import("./store-classification-prisma");

    await createSparePartMaterialGroup(actor, scope, {
      categoryId: "category",
      code: " pipe ",
      name: " Pipe ",
    });

    expect(mocks.tx.sparePartCategory.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: "category", plantId: "site", active: true },
    });
    expect(mocks.tx.sparePartMaterialGroup.create).toHaveBeenCalledWith({
      data: {
        organizationId: "org",
        plantId: "site",
        categoryId: "category",
        code: "PIPE",
        name: "Pipe",
        active: true,
      },
    });
    expect(mocks.tx.auditEvent.create).toHaveBeenCalledOnce();
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
  });

  it("rejects a mismatched Organization and Site before classification lookup", async () => {
    mocks.tx.plant.findFirstOrThrow.mockRejectedValue(
      new Error("scope mismatch"),
    );
    const { createSparePartCategory } =
      await import("./store-classification-prisma");

    await expect(
      createSparePartCategory(actor, scope, {
        code: "ELEC",
        name: "Electrical",
      }),
    ).rejects.toThrow("scope mismatch");
    expect(mocks.tx.sparePartCategory.findFirst).not.toHaveBeenCalled();
  });

  it("rejects duplicate category code or name before creating", async () => {
    mocks.tx.sparePartCategory.findFirst.mockResolvedValue({ id: "existing" });
    const { createSparePartCategory } =
      await import("./store-classification-prisma");

    await expect(
      createSparePartCategory(actor, scope, {
        code: "ELEC",
        name: "Electrical",
      }),
    ).rejects.toThrow(
      "Spare part category code or name already exists in this Site.",
    );
    expect(mocks.tx.sparePartCategory.create).not.toHaveBeenCalled();
  });

  it("preserves an in-use category and skips its audit", async () => {
    mocks.tx.sparePartCategory.findFirstOrThrow.mockResolvedValue({
      id: "category",
      code: "ELEC",
      name: "Electrical",
      _count: { spareParts: 2 },
    });
    const { deleteSparePartCategory } =
      await import("./store-classification-prisma");

    await expect(
      deleteSparePartCategory(actor, scope, "category"),
    ).rejects.toThrow(
      "This spare part category is already in use. Set it to inactive instead.",
    );
    expect(mocks.tx.sparePartCategory.delete).not.toHaveBeenCalled();
    expect(mocks.tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("propagates audit failure from the classification transaction", async () => {
    mocks.tx.sparePartCategory.create.mockResolvedValue({
      id: "category",
      code: "ELEC",
      name: "Electrical",
    });
    mocks.tx.auditEvent.create.mockRejectedValue(new Error("audit failed"));
    const { createSparePartCategory } =
      await import("./store-classification-prisma");

    await expect(
      createSparePartCategory(actor, scope, {
        code: "ELEC",
        name: "Electrical",
      }),
    ).rejects.toThrow("audit failed");
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
  });
});
