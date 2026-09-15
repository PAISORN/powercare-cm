import { describe, expect, it } from "vitest";
import { buildDailyIssueReportRows, enumerateBangkokDateKeys } from "./store-daily-issue-report";

const basePart = {
  id: "part-1",
  itemKind: "SPARE_PART",
  code: "SP-001",
  itemCode: "BRG-001",
  name: "Bearing",
  unit: "ชิ้น",
  minStock: 2,
  latestUnitPrice: 100,
  categoryName: "Mechanical",
  materialGroupName: "Bearing Group",
};
const store = { id: "store-1", code: "RTB-ST", name: "Main Store" };

describe("daily issue report", () => {
  it("creates one ordered Excel column for every selected Bangkok date", () => {
    expect(enumerateBangkokDateKeys(
      new Date("2026-09-14T17:00:00.000Z"),
      new Date("2026-09-16T16:59:59.999Z"),
    )).toEqual(["2026-09-15", "2026-09-16"]);
  });

  it("aggregates actual issued quantities by item, store, and day", () => {
    const rows = buildDailyIssueReportRows([
      { occurredAt: new Date("2026-09-15T02:00:00.000Z"), quantityChange: -2, unitPrice: 90, store, sparePart: basePart },
      { occurredAt: new Date("2026-09-15T10:00:00.000Z"), quantityChange: -1, unitPrice: 100, store, sparePart: basePart },
      { occurredAt: new Date("2026-09-16T03:00:00.000Z"), quantityChange: -4, unitPrice: null, store, sparePart: basePart },
    ], {
      start: new Date("2026-09-14T17:00:00.000Z"),
      end: new Date("2026-09-16T16:59:59.999Z"),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      "Store Code": "RTB-ST",
      "Store Name": "Main Store",
      "Item Type": "SPARE_PART",
      "Item Code": "BRG-001",
      "Item Name": "Bearing",
      Category: "Mechanical",
      "Material Group": "Bearing Group",
      Quantity: 7,
      Minimum: 2,
      Unit: "ชิ้น",
      "Unit Price": 100,
      "Total Value": 680,
      "วันที่ 15/09/2026": 3,
      "วันที่ 16/09/2026": 4,
    });
    expect(Object.keys(rows[0]).slice(-2)).toEqual(["วันที่ 15/09/2026", "วันที่ 16/09/2026"]);
  });
});
