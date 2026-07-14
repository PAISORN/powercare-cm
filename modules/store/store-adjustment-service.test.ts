import { describe, expect, it } from "vitest";
import {
  adjustStockWithRepository,
  type StoreReceiveRepository,
} from "./store-receive-service";
import { StockMovementType } from "./store-types";

function createRepository(initialBalance = 5): StoreReceiveRepository & {
  movements: unknown[];
  balances: Record<string, number>;
} {
  return {
    movements: [],
    balances: { "store-1:part-1": initialBalance },
    async createReceive() {
      return { id: "receive-1" };
    },
    async getStockBalance(input) {
      return this.balances[`${input.storeId}:${input.sparePartId}`] ?? 0;
    },
    async addStock(input) {
      const key = `${input.storeId}:${input.sparePartId}`;
      this.balances[key] = (this.balances[key] ?? 0) + input.quantity;
      return { balanceAfter: this.balances[key] };
    },
    async updateLatestUnitPrice() {},
    async createMovement(input) {
      this.movements.push(input);
    },
  };
}

describe("stock adjustment service", () => {
  const actor = { id: "store-officer-1", role: "STORE_OFFICER", plantId: "site-rtb" };
  const scope = { organizationId: "org-1", plantId: "site-rtb", plantCode: "RTB" };

  it("adjusts stock and records the reason and resulting balance", async () => {
    const repository = createRepository(5);

    const result = await adjustStockWithRepository(repository, actor, scope, {
      storeId: "store-1",
      sparePartId: "part-1",
      quantityChange: -2,
      note: "Cycle count",
      occurredAt: new Date("2026-07-09T01:00:00.000Z"),
    });

    expect(result).toEqual({ balanceAfter: 3 });
    expect(repository.movements).toMatchObject([
      {
        movementType: StockMovementType.ADJUSTMENT,
        quantityChange: -2,
        balanceAfter: 3,
        note: "Cycle count",
      },
    ]);
  });

  it("requires a reason", async () => {
    const repository = createRepository();

    await expect(
      adjustStockWithRepository(repository, actor, scope, {
        storeId: "store-1",
        sparePartId: "part-1",
        quantityChange: 1,
        note: " ",
        occurredAt: new Date(),
      }),
    ).rejects.toThrow("reason is required");
  });

  it("rejects an adjustment that would make stock negative", async () => {
    const repository = createRepository(2);

    await expect(
      adjustStockWithRepository(repository, actor, scope, {
        storeId: "store-1",
        sparePartId: "part-1",
        quantityChange: -3,
        note: "Damaged stock",
        occurredAt: new Date(),
      }),
    ).rejects.toThrow("must not be negative");

    expect(repository.balances["store-1:part-1"]).toBe(2);
    expect(repository.movements).toHaveLength(0);
  });

  it("blocks an actor from another Site", async () => {
    const repository = createRepository();

    await expect(
      adjustStockWithRepository(repository, { ...actor, plantId: "site-other" }, scope, {
        storeId: "store-1",
        sparePartId: "part-1",
        quantityChange: 1,
        note: "Count correction",
        occurredAt: new Date(),
      }),
    ).rejects.toThrow("outside the selected site scope");
  });
});
