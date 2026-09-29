import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parseStockListQuery } from "../../../modules/store/stock-list-query";
import { StockListStateFields } from "./stock-list-state-fields";

describe("StockListStateFields", () => {
  it("renders scope and active filters while leaving page to the form control", () => {
    const html = renderToStaticMarkup(
      <StockListStateFields
        query={parseStockListQuery({
          search: "pump seal",
          storeId: "store-1",
          typeId: "type-1",
          categoryId: "category-1",
          materialGroupId: "group-1",
          itemKind: "SPARE_PART",
          unit: "SET",
          stockStatus: "nearMin",
          page: "3",
        })}
        scope={{ organizationId: "org-1", plantId: "plant-1" }}
      />,
    );

    for (const [name, value] of [
      ["organizationId", "org-1"],
      ["plantId", "plant-1"],
      ["search", "pump seal"],
      ["storeId", "store-1"],
      ["typeId", "type-1"],
      ["categoryId", "category-1"],
      ["materialGroupId", "group-1"],
      ["itemKind", "SPARE_PART"],
      ["unit", "SET"],
      ["stockStatus", "nearMin"],
    ]) {
      expect(html).toContain(`name="${name}"`);
      expect(html).toContain(`value="${value}"`);
    }
    expect(html).not.toContain('name="page"');
  });

  it("omits inactive optional filters", () => {
    const html = renderToStaticMarkup(
      <StockListStateFields
        query={parseStockListQuery({})}
        scope={{ organizationId: "org-1", plantId: "plant-1" }}
      />,
    );

    expect(html).toContain('name="organizationId"');
    expect(html).toContain('name="plantId"');
    expect(html).not.toContain('name="search"');
    expect(html).not.toContain('name="stockStatus"');
  });
});
