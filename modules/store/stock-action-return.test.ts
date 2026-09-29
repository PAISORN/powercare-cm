import { describe, expect, it } from "vitest";
import {
  safeStockReturnTo,
  stockHrefWithFeedback,
} from "./stock-action-return";

const scope = { organizationId: "org 1", plantId: "plant/1" };
const scopedHref =
  "/dashboardstore/stock?organizationId=org%201&plantId=plant%2F1";

describe("Stock action return URL", () => {
  it("keeps list filters, page, and row hash for the selected scope", () => {
    const requested = `${scopedHref}&search=seal&page=3#stock-row-part-1`;

    expect(safeStockReturnTo(scope, requested)).toBe(requested);
    expect(stockHrefWithFeedback(requested, "saved", "received")).toBe(
      `${scopedHref}&search=seal&page=3&saved=received#stock-row-part-1`,
    );
  });

  it("drops the hash when the completed action removes the row", () => {
    expect(
      safeStockReturnTo(
        scope,
        `${scopedHref}&categoryId=cat-1#stock-row-part-1`,
        false,
      ),
    ).toBe(`${scopedHref}&categoryId=cat-1`);
  });

  it("rejects a return URL outside the resolved organization and plant", () => {
    expect(
      safeStockReturnTo(
        scope,
        "/dashboardstore/stock?organizationId=other&plantId=other&page=9",
      ),
    ).toBe(scopedHref);
    expect(
      safeStockReturnTo(
        scope,
        `${scopedHref}evil&search=seal`,
      ),
    ).toBe(scopedHref);
    expect(
      safeStockReturnTo(
        scope,
        `https://example.com${scopedHref}`,
      ),
    ).toBe(scopedHref);
  });

  it("encodes feedback without losing the existing query", () => {
    expect(stockHrefWithFeedback(scopedHref, "error", "ลองใหม่ อีกครั้ง")).toBe(
      `${scopedHref}&error=${encodeURIComponent("ลองใหม่ อีกครั้ง")}`,
    );
  });
});
