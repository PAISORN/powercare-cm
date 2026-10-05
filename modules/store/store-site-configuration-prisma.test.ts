import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";

const mocks = vi.hoisted(() => {
  const tx = {
    plant: { findFirstOrThrow: vi.fn(), update: vi.fn() },
    auditEvent: { create: vi.fn() },
    storeCategory: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
    },
    store: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    zone: { count: vi.fn() },
    storeApplicableZone: { findMany: vi.fn(), upsert: vi.fn() },
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

describe("Store Site configuration persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tx.plant.findFirstOrThrow.mockResolvedValue({ id: "site" });
    mocks.tx.auditEvent.create.mockResolvedValue({ id: "audit" });
    mocks.tx.storeCategory.findFirst.mockResolvedValue(null);
    mocks.tx.store.findFirst.mockResolvedValue(null);
    mocks.tx.storeApplicableZone.findMany.mockResolvedValue([]);
  });

  it("normalizes the Site inventory code and audits it in one transaction", async () => {
    mocks.tx.plant.update.mockResolvedValue({
      id: "site",
      inventoryCode: "RTB",
    });
    const { updateStoreSiteCode } =
      await import("./store-site-configuration-prisma");

    await expect(updateStoreSiteCode(actor, scope, " rtb ")).resolves.toEqual({
      id: "site",
      inventoryCode: "RTB",
    });
    expect(mocks.tx.plant.update).toHaveBeenCalledWith({
      where: { id: "site" },
      data: { inventoryCode: "RTB" },
      select: { id: true, inventoryCode: true },
    });
    expect(mocks.tx.auditEvent.create).toHaveBeenCalledOnce();
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
  });

  it("rejects a mismatched Organization and Site before mutation", async () => {
    mocks.tx.plant.findFirstOrThrow.mockRejectedValue(
      new Error("scope mismatch"),
    );
    const { updateStoreSiteCode } =
      await import("./store-site-configuration-prisma");

    await expect(updateStoreSiteCode(actor, scope, "RTB")).rejects.toThrow(
      "scope mismatch",
    );
    expect(mocks.tx.plant.update).not.toHaveBeenCalled();
    expect(mocks.tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("rejects invalid Store codes consistently during create", async () => {
    const { createStore } = await import("./store-site-configuration-prisma");

    await expect(
      createStore(actor, scope, { name: "Main Store", code: "MAIN STORE" }),
    ).rejects.toThrow(
      "Store code may contain letters, numbers, dot, underscore, slash, or hyphen only.",
    );
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a duplicate Store before writing or auditing", async () => {
    mocks.tx.store.findFirst.mockResolvedValue({ id: "existing" });
    const { createStore } = await import("./store-site-configuration-prisma");

    await expect(
      createStore(actor, scope, { name: "Main Store", code: "MAIN" }),
    ).rejects.toThrow("Store name or code already exists in this Site.");
    expect(mocks.tx.store.create).not.toHaveBeenCalled();
    expect(mocks.tx.auditEvent.create).not.toHaveBeenCalled();
  });

  it("propagates audit failure from the same transaction callback", async () => {
    mocks.tx.store.create.mockResolvedValue({
      id: "store",
      name: "Main Store",
      code: "MAIN",
    });
    mocks.tx.auditEvent.create.mockRejectedValue(new Error("audit failed"));
    const { createStore } = await import("./store-site-configuration-prisma");

    await expect(
      createStore(actor, scope, { name: "Main Store", code: "MAIN" }),
    ).rejects.toThrow("audit failed");
    expect(mocks.db.$transaction).toHaveBeenCalledOnce();
  });

  it("rejects duplicate Applicable Zone codes before starting a transaction", async () => {
    const { updateStoreApplicableZones } =
      await import("./store-site-configuration-prisma");

    await expect(
      updateStoreApplicableZones(actor, scope, [
        { zoneId: "zone-a", code: "A", active: true },
        { zoneId: "zone-b", code: "a", active: true },
      ]),
    ).rejects.toThrow(
      "Applicable Zone code must not be duplicated in the same Site.",
    );
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });

  it("assigns the first free Site code when an enabled CM Zone has no Stock code", async () => {
    mocks.tx.zone.count.mockResolvedValue(3);
    mocks.tx.storeApplicableZone.findMany.mockResolvedValue([]);
    mocks.tx.storeApplicableZone.upsert.mockResolvedValue({});
    const { updateStoreApplicableZones } =
      await import("./store-site-configuration-prisma");

    await updateStoreApplicableZones(actor, scope, [
      { zoneId: "zone-fuel", code: "01", active: true },
      { zoneId: "zone-boiler", code: "02", active: true },
      { zoneId: "zone-ash", code: "", active: true },
    ]);

    expect(mocks.tx.storeApplicableZone.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          zoneId: "zone-ash",
          code: "03",
          active: true,
        }),
      }),
    );
  });
});
