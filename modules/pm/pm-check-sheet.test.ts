import { describe, expect, it, vi } from "vitest";
import { loadPmCheckSheetSnapshots, parsePmCheckSheetSnapshot, pmCheckSheetOtherName, pmCheckSheetResultName, serializePmCheckSheetSnapshot } from "./pm-check-sheet";

describe("PM Check Sheet snapshots", () => {
  it("combines live Default fields with Asset-scoped Custom items", async () => {
    const client = { asset: { findMany: vi.fn().mockResolvedValue([{ id: "asset-1", code: "P-001", nameTh: "Pump", assetType: { code: "PMP", nameTh: "Pump", fields: [{ id: "field-1", labelTh: "แรงดัน", labelEn: null, dataType: "NUMBER", unit: "bar", optionsJson: null, helpText: null, indicatorText: "3-5 bar", required: true, sortOrder: 0 }] }, pmCheckSheetItems: [{ id: "custom-1", labelTh: "เสียงผิดปกติ", dataType: "BOOLEAN", unit: null, optionsJson: null, helpText: null, indicatorText: null, required: false, sortOrder: 0 }] }]) } };
    const snapshots = await loadPmCheckSheetSnapshots(client as never, ["asset-1"]);
    const snapshot = snapshots.get("asset-1")!;
    expect(snapshot.items.map((item) => [item.source, item.labelTh])).toEqual([["DEFAULT", "แรงดัน"], ["CUSTOM", "เสียงผิดปกติ"]]);
    expect(pmCheckSheetResultName(snapshot.assetId, snapshot.items[0])).toBe("result_asset-1_field-1");
    expect(pmCheckSheetResultName(snapshot.assetId, snapshot.items[1])).toBe("result_asset-1_custom_custom-1");
    expect(pmCheckSheetOtherName(snapshot.assetId, snapshot.items[1])).toBe("other_asset-1_custom_custom-1");
  });

  it("round-trips an immutable versioned snapshot", () => {
    const snapshot = { version: 1 as const, assetId: "asset-1", assetCode: "P-001", assetName: "Pump", assetTypeName: "PMP · Pump", items: [] };
    const serialized = serializePmCheckSheetSnapshot(snapshot);
    expect(parsePmCheckSheetSnapshot(serialized)).toEqual(snapshot);
    expect(parsePmCheckSheetSnapshot('{"version":2}')).toBeNull();
  });
});
