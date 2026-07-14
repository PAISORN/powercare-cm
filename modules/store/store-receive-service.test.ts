import { describe, expect, it } from "vitest";
import { adjustStockWithRepository, receiveStockWithRepository, type StoreReceiveRepository } from "./store-receive-service";
import { StockMovementType } from "./store-types";

function createRepository(): StoreReceiveRepository & {
  receives: unknown[];
  movements: unknown[];
  latestPrices: unknown[];
  balances: Record<string, number>;
} {
  return {
    receives: [],
    movements: [],
    latestPrices: [],
    balances: {},
    async createReceive(input) {
      this.receives.push(input);
      return { id: "receive-1" };
    },
    async addStock(input) {
      const key = `${input.storeId}:${input.sparePartId}`;
      this.balances[key] = (this.balances[key] ?? 0) + input.quantity;
      return { balanceAfter: this.balances[key] };
    },
    async getStockBalance(input) {
      return this.balances[`${input.storeId}:${input.sparePartId}`] ?? 0;
    },
    async updateLatestUnitPrice(input) {
      this.latestPrices.push(input);
    },
    async createMovement(input) {
      this.movements.push(input);
    },
  };
}

describe("store receive service", () => {
  const actor = { id: "store-officer-1", role: "STORE_OFFICER", plantId: "site-rtb" };
  const scope = { organizationId: "org-1", plantId: "site-rtb", plantCode: "RTB" };

  it("receives multiple items and writes stock movements", async () => {
    const repository = createRepository();
    const receivedAt = new Date("2026-07-08T01:00:00.000Z");

    const result = await receiveStockWithRepository(repository, actor, scope, {
      number: "RCV-1",
      receivedAt,
      items: [
        { storeId: "store-1", sparePartId: "part-1", quantity: 3, unitPrice: 120 },
        { storeId: "store-1", sparePartId: "part-2", quantity: 5 },
      ],
    });

    expect(result).toEqual({ id: "receive-1" });
    expect(repository.receives).toHaveLength(1);
    expect(repository.latestPrices).toEqual([{ sparePartId: "part-1", unitPrice: 120 }]);
    expect(repository.balances).toEqual({ "store-1:part-1": 3, "store-1:part-2": 5 });
    expect(repository.movements).toMatchObject([
      { movementType: StockMovementType.RECEIVE, quantityChange: 3, balanceAfter: 3, refId: "receive-1" },
      { movementType: StockMovementType.RECEIVE, quantityChange: 5, balanceAfter: 5, refId: "receive-1" },
    ]);
  });

  it("rejects empty or invalid receive input", async () => {
    const repository = createRepository();
    await expect(
      receiveStockWithRepository(repository, actor, scope, {
        number: "RCV-1",
        receivedAt: new Date(),
        items: [],
      }),
    ).rejects.toThrow("at least one item");

    await expect(
      receiveStockWithRepository(repository, actor, scope, {
        number: "RCV-1",
        receivedAt: new Date(),
        items: [{ storeId: "store-1", sparePartId: "part-1", quantity: 0 }],
      }),
    ).rejects.toThrow("greater than zero");
  });

  it("blocks actor from another site", async () => {
    const repository = createRepository();
    await expect(
      adjustStockWithRepository(repository, { ...actor, plantId: "site-other" }, scope, {
        storeId: "store-1",
        sparePartId: "part-1",
        quantityChange: 1,
        occurredAt: new Date(),
      }),
    ).rejects.toThrow("outside the selected site scope");
  });
});
