import { describe, expect, it } from "vitest";
import { AssetHierarchyNode, cleanAssetName, defaultAssetLevelForType, isSystemAssetType, isValidAssetSystemName, normalizeAssetTypeName, validateAssetHierarchy } from "./asset-hierarchy";
const main: AssetHierarchyNode = { id: "main", plantId: "site", systemId: "system", parentId: null, assetLevel: "MAIN_ASSET" };
const sub: AssetHierarchyNode = { ...main, id: "sub", parentId: "main", assetLevel: "SUB_ASSET" };
const part: AssetHierarchyNode = { ...main, id: "part", parentId: "sub", assetLevel: "PART" };
describe("Asset hierarchy contract", () => {
 it.each([main, sub, { ...sub, parentId: null }, part, { ...part, parentId: "main" }, { ...part, parentId: null }])("accepts valid edge for $id/$parentId", node => expect(validateAssetHierarchy(node, [main, sub, part])).toEqual([]));
 it.each([
  [{ ...main, systemId: null }, "SYSTEM_REQUIRED"],
  [{ ...sub, parentId: "part" }, "INVALID_PARENT_LEVEL"], [{ ...part, parentId: "missing" }, "PARENT_NOT_FOUND"],
  [{ ...part, plantId: "other" }, "CROSS_SITE_PARENT"], [{ ...part, systemId: "other" }, "CROSS_SYSTEM_PARENT"],
  [{ ...main, parentId: "part" }, "CYCLE"], [{ ...main, parentId: "main" }, "CYCLE"],
  [{ ...main, assetLevel: "INVALID" }, "INVALID_LEVEL"],
  [{ ...main, assetTypeName: "Water Treatment" }, "INVALID_ASSET_TYPE"],
 ] as const)("rejects invalid mutation %#", (node, error) => expect(validateAssetHierarchy(node, [main,sub,part])).toContain(error));
 it("rejects moving a parent away from its children", () => expect(validateAssetHierarchy({ ...main, systemId: "other" }, [main,sub])).toContain("CROSS_SYSTEM_PARENT"));
 it("review status does not bypass ordinary validation", () => expect(validateAssetHierarchy({ ...part, parentId: "missing", migrationStatus: "NEED_PARENT_REVIEW" }, [])).toContain("PARENT_NOT_FOUND"));
 it.each([["AC Motor","Motor"],["PUMP","Pump"],["GEAR","Gearbox"],["Gear Box","Gearbox"],["Fuel Belt Conveyor","Conveyor"]])("normalizes %s", (old, expected) => expect(normalizeAssetTypeName(old)).toBe(expected));
 it.each(["Manual Valve","Control Valve","Safety Valve","Pressure Regulating Valve","Pressure Transmitter","Bearing"])("classifies %s as Part", type => expect(defaultAssetLevelForType(type)).toBe("PART"));
 it("allows actual Steam Turbine equipment while blocking System categories", () => { expect(isSystemAssetType("Steam Turbine")).toBe(false); expect(isSystemAssetType("Steam Turbine System")).toBe(true); expect(defaultAssetLevelForType("Pump Set")).toBe("MAIN_ASSET"); });
 it("permits explicit Instrument and Control Valve Systems", () => { expect(isValidAssetSystemName("Instrument")).toBe(true); expect(isValidAssetSystemName("Control Valve")).toBe(true); expect(isValidAssetSystemName(" ")).toBe(false); });
 it("preserves location text when it is part of the Asset name", () => { expect(cleanAssetName("MCC-05 @ESP Room Z08a")).toBe("MCC-05 @ESP Room Z08a"); });
});
