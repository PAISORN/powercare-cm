import { describe, expect, it, vi } from "vitest";
import { prepareAssetImport } from "./asset-import";

function transaction() {
  return {
    assetSystem: { findMany: vi.fn().mockResolvedValue([{ id: "system", code: "SYS", nameTh: "Boiler & Combustion", nameEn: null, plantId: "site", active: true }]), findFirst: vi.fn().mockResolvedValue({ id: "system", code: "SYS", nameTh: "Boiler & Combustion", nameEn: null }) },
    assetType: { findMany: vi.fn().mockResolvedValue([{ id: "type", code: "PSET", nameTh: "Pump Set", nameEn: null, plantId: "site", active: true }]), findFirst: vi.fn().mockResolvedValue({ id: "type", code: "PSET", nameTh: "Pump Set", nameEn: null, discipline: "Mechanical" }) },
    zone: { findMany: vi.fn().mockResolvedValue([]) }, assetFamily: { findMany: vi.fn().mockResolvedValue([]) }, assetClass: { findMany: vi.fn().mockResolvedValue([]) },
    asset: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
  };
}

describe("Asset import preparation", () => {
  it("keeps the exact Asset Code supplied by the source file", async () => {
    const result = await prepareAssetImport(transaction() as never, "site", [{ "Asset Code": "MC-BFP-001", "Asset Name": "Boiler Feed Pump Set A", System: "SYS", "Asset Level": "MAIN_ASSET", "Asset Type": "PSET", Discipline: "Mechanical" }]);
    expect(result[0].input.code).toBe("MC-BFP-001");
    expect(result[0].input.parentId).toBeNull();
  });

  it("accepts a child whose exact Parent Code is defined earlier in the same batch", async () => {
    const result = await prepareAssetImport(transaction() as never, "site", [
      { "Asset Code": "MC-PMP-001", "Asset Name": "Main", System: "SYS", "Asset Level": "MAIN_ASSET", "Asset Type": "PSET" },
      { "Asset Code": "MC-PMP-002", "Asset Name": "Sub", System: "SYS", "Asset Level": "SUB_ASSET", "Asset Type": "PSET", "Parent Code": "MC-PMP-001" },
    ]);
    expect(result[1].input.parentId).toBe(result[0].id);
    expect(result.map(item => item.input.code)).toEqual(["MC-PMP-001", "MC-PMP-002"]);
  });
  it("rejects missing or duplicate source Asset Codes before writing", async () => {
    const rows = [{ "Asset Code": "DUP" }, { "Asset Code": "DUP" }];
    await expect(prepareAssetImport(transaction() as never, "site", rows)).rejects.toThrow("Asset Code ต้องไม่ว่างและไม่ซ้ำกันในไฟล์");
  });
});
