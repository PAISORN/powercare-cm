import { describe, expect, it } from "vitest";
import {
  AGGREGATE_STOCK_EXCEEDED_MESSAGE,
  INVALID_ISSUE_LINE_MESSAGE,
  validateIssueLines,
} from "./issue-request-validation";

const stocks = [{ storeId: "store-1", sparePartId: "part-1", available: 3 }];

function line(
  overrides: Partial<{
    stockKey: string;
    zoneId: string;
    requestedQty: string;
  }> = {},
) {
  return {
    id: 1,
    stockKey: "store-1:part-1",
    stockSearch: "Part 1",
    zoneId: "zone-1",
    requestedQty: "1",
    ...overrides,
  };
}

describe("validateIssueLines", () => {
  it("accepts complete lines within available stock", () => {
    expect(validateIssueLines([line()], stocks)).toBeNull();
  });

  it.each([
    { stockKey: "" },
    { zoneId: "" },
    { requestedQty: "0" },
    { requestedQty: "1.5" },
    { requestedQty: "4" },
  ])("rejects an invalid line: %o", (overrides) => {
    expect(validateIssueLines([line(overrides)], stocks)).toBe(
      INVALID_ISSUE_LINE_MESSAGE,
    );
  });

  it("rejects duplicate lines whose combined quantity exceeds stock", () => {
    expect(
      validateIssueLines(
        [
          line({ requestedQty: "2" }),
          { ...line({ requestedQty: "2" }), id: 2 },
        ],
        stocks,
      ),
    ).toBe(AGGREGATE_STOCK_EXCEEDED_MESSAGE);
  });
});
