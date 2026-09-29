import { describe, expect, it } from "vitest";
import { buildStockPageModel, STOCK_PAGE_SIZE } from "./stock-page-model";

function stock(input: {
  id: string;
  name: string;
  category?: string | null;
  quantity?: number;
  minStock?: number;
  unitPrice?: number | null;
}) {
  return {
    id: input.id,
    quantity: input.quantity ?? 0,
    sparePart: {
      name: input.name,
      minStock: input.minStock ?? 0,
      latestUnitPrice: input.unitPrice ?? null,
      category:
        input.category === null
          ? null
          : { name: input.category ?? "General" },
    },
  };
}

describe("buildStockPageModel", () => {
  it("calculates the visible stock summary", () => {
    const model = buildStockPageModel(
      [
        stock({
          id: "enough",
          name: "Enough",
          quantity: 8,
          minStock: 4,
          unitPrice: 10,
        }),
        stock({
          id: "near",
          name: "Near",
          quantity: 2,
          minStock: 2,
          unitPrice: 5,
        }),
        stock({
          id: "out",
          name: "Out",
          quantity: 0,
          minStock: 3,
          unitPrice: 99,
        }),
      ],
      1,
    );

    expect(model.summary).toEqual({
      totalQuantity: 10,
      totalValue: 90,
      itemCount: 3,
      nearMinCount: 1,
      outOfStockCount: 1,
    });
  });

  it("sorts by category and part name without mutating the source rows", () => {
    const rows = [
      stock({ id: "zulu", name: "Zulu", category: "B" }),
      stock({ id: "beta", name: "Beta", category: "A" }),
      stock({ id: "alpha", name: "Alpha", category: "A" }),
    ];

    const model = buildStockPageModel(rows, 1);

    expect(model.groupedStocks.map((row) => row.id)).toEqual([
      "alpha",
      "beta",
      "zulu",
    ]);
    expect(rows.map((row) => row.id)).toEqual(["zulu", "beta", "alpha"]);
    expect(model.stockRowNumbers.get("alpha")).toBe(1);
    expect(model.stockRowNumbers.get("beta")).toBe(2);
    expect(model.stockRowNumbers.get("zulu")).toBe(1);
  });

  it("puts item 51 on page 2 and keeps its category running number", () => {
    const rows = Array.from({ length: STOCK_PAGE_SIZE + 1 }, (_, index) =>
      stock({
        id: `part-${String(index + 1).padStart(3, "0")}`,
        name: `Part ${String(index + 1).padStart(3, "0")}`,
        category: "Shared",
        quantity: 1,
      }),
    );

    const model = buildStockPageModel(rows, 2);

    expect(model.currentPage).toBe(2);
    expect(model.totalPages).toBe(2);
    expect(model.pageStart).toBe(51);
    expect(model.pageEnd).toBe(51);
    expect(model.pagedStocks.map((row) => row.id)).toEqual(["part-051"]);
    expect(model.stockRowNumbers.get("part-051")).toBe(51);
  });

  it("clamps invalid and out-of-range pages and handles an empty result", () => {
    expect(buildStockPageModel([], 99)).toMatchObject({
      currentPage: 1,
      totalPages: 1,
      pageStart: 0,
      pageEnd: 0,
      pagedStocks: [],
    });

    const model = buildStockPageModel(
      [stock({ id: "only", name: "Only" })],
      99,
    );
    expect(model.currentPage).toBe(1);
    expect(model.pagedStocks).toHaveLength(1);
  });
});
