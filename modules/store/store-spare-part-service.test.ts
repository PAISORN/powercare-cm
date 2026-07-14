import { describe, expect, it } from "vitest";
import {
  createSparePartWithRepository,
  type CreateSparePartInput,
  type SparePartRepository,
} from "./store-spare-part-service";

function createRepository(): SparePartRepository & { created: unknown[] } {
  return {
    created: [],
    async reserveNextNumber() {
      return 7;
    },
    async createSparePart(input) {
      this.created.push(input);
      return { id: "part-1", code: input.code };
    },
  };
}

const scope = { organizationId: "org-1", plantId: "plant-1", plantCode: "RTB" };

function validInput(overrides: Partial<CreateSparePartInput> = {}): CreateSparePartInput {
  return {
    name: "Mechanical seal",
    unit: "PCS",
    itemCode: "ACC-1001",
    categoryId: "category-1",
    typeId: "type-1",
    defaultStoreId: "store-1",
    storageZoneId: "storage-zone-1",
    minStock: 2,
    maxStock: 10,
    reorderPoint: 4,
    latestUnitPrice: 450,
    zoneIds: ["zone-1", "zone-2"],
    ...overrides,
  };
}

describe("store spare part service", () => {
  it("creates a site-scoped spare part with the next generated code", async () => {
    const repository = createRepository();

    const result = await createSparePartWithRepository(repository, scope, validInput());

    expect(result).toEqual({ id: "part-1", code: "SP-RTB-00007" });
    expect(repository.created).toMatchObject([
      {
        organizationId: "org-1",
        plantId: "plant-1",
        code: "SP-RTB-00007",
        name: "Mechanical seal",
        maxStock: 10,
        zoneIds: ["zone-1", "zone-2"],
      },
    ]);
  });

  it("normalizes codes, optional values, and removes duplicate zones", async () => {
    const repository = createRepository();

    await createSparePartWithRepository(
      repository,
      scope,
      validInput({
        itemCode: " acc-1001 ",
        description: " ",
        zoneIds: ["zone-1", "zone-1", ""],
      }),
    );

    expect(repository.created).toMatchObject([
      {
        itemCode: "ACC-1001",
        categoryId: "category-1",
        description: null,
        zoneIds: ["zone-1"],
      },
    ]);
  });

  it("rejects invalid stock and price values", async () => {
    const repository = createRepository();

    await expect(createSparePartWithRepository(repository, scope, validInput({ minStock: -1 }))).rejects.toThrow(
      "Minimum stock",
    );
    await expect(createSparePartWithRepository(repository, scope, validInput({ maxStock: -1 }))).rejects.toThrow(
      "Maximum stock",
    );
    await expect(createSparePartWithRepository(repository, scope, validInput({ minStock: 5, maxStock: 4 }))).rejects.toThrow(
      "Maximum stock",
    );
    await expect(
      createSparePartWithRepository(repository, scope, validInput({ latestUnitPrice: -0.01 })),
    ).rejects.toThrow("Latest unit price");
    await expect(createSparePartWithRepository(repository, scope, validInput({ reorderPoint: -1 }))).rejects.toThrow(
      "Reorder point",
    );
    await expect(
      createSparePartWithRepository(repository, scope, validInput({ reorderPoint: 11 })),
    ).rejects.toThrow("Reorder point");
  });

  it("requires every code source used by issue numbering", async () => {
    const repository = createRepository();

    await expect(createSparePartWithRepository(repository, scope, validInput({ itemCode: "" }))).rejects.toThrow(
      "Item Code is required",
    );
    await expect(createSparePartWithRepository(repository, scope, validInput({ typeId: "" }))).rejects.toThrow(
      "Spare part type is required",
    );
  });
});
