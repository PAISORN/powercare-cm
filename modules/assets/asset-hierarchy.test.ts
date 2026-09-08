import { describe, expect, it } from "vitest";
import { AssetHierarchyNode, cleanAssetName, defaultAssetLevelForType, isSystemAssetType, isValidAssetSystemName, normalizeAssetTypeName, validateAssetHierarchy } from "./asset-hierarchy";
const main: AssetHierarchyNode = { id: "main", plantId: "site", systemId: "system", parentId: null, assetLevel: "MAIN_ASSET" };
const sub: AssetHierarchyNode = { ...main, id: "sub", parentId: "main", assetLevel: "SUB_ASSET" };
const part: AssetHierarchyNode = { ...main, id: "part", parentId: "sub", assetLevel: "PART" };
describe("Asset hierarchy contract", () => {
 it.each([main, sub, part, { ...part, parentId: "main" }])("accepts valid edge for $id/$parentId", node => expect(validateAssetHierarchy(node, [main, sub, part])).toEqual([]));
 it.each([
  [{ ...main, systemId: null }, "SYSTEM_REQUIRED"], [{ ...sub, parentId: null }, "PARENT_REQUIRED"],
  [{ ...sub, parentId: "part" }, "INVALID_PARENT_LEVEL"], [{ ...part, parentId: "missing" }, "PARENT_NOT_FOUND"],
  [{ ...part, plantId: "other" }, "CROSS_SITE_PARENT"], [{ ...part, systemId: "other" }, "CROSS_SYSTEM_PARENT"],
  [{ ...main, parentId: "part" }, "CYCLE"], [{ ...main, parentId: "main" }, "CYCLE"],
  [{ ...main, assetLevel: "INVALID" }, "INVALID_LEVEL"], [{ ...main, nameTh: "Pump Z08b" }, "ZONE_SUFFIX"],
  [{ ...main, assetTypeName: "Water Treatment" }, "INVALID_ASSET_TYPE"],
  [{ ...main, assetTypeName: "Pressure Transmitter" }, "INSTRUMENT_MUST_BE_PART"],
  [{ ...main, discipline: "Instrument" }, "INSTRUMENT_MUST_BE_PART"],
  [{ ...main, assetTypeName: "Control Valve" }, "VALVE_MUST_BE_PART"],
 ] as const)("rejects invalid mutation %#", (node, error) => expect(validateAssetHierarchy(node, [main,sub,part])).toContain(error));
 it("rejects moving a parent away from its children", () => expect(validateAssetHierarchy({ ...main, systemId: "other" }, [main,sub])).toContain("CROSS_SYSTEM_PARENT"));
 it("review status does not bypass ordinary validation", () => expect(validateAssetHierarchy({ ...part, parentId: null, migrationStatus: "NEED_PARENT_REVIEW" }, [])).toContain("PARENT_REQUIRED"));
 it.each([["AC Motor","Motor"],["PUMP","Pump"],["GEAR","Gearbox"],["Gear Box","Gearbox"],["Fuel Belt Conveyor","Conveyor"]])("normalizes %s", (old, expected) => expect(normalizeAssetTypeName(old)).toBe(expected));
 it.each(["Manual Valve","Control Valve","Safety Valve","Pressure Regulating Valve","Pressure Transmitter","Bearing"])("classifies %s as Part", type => expect(defaultAssetLevelForType(type)).toBe("PART"));
 it("allows actual Steam Turbine equipment while blocking System categories", () => { expect(isSystemAssetType("Steam Turbine")).toBe(false); expect(isSystemAssetType("Steam Turbine System")).toBe(true); expect(defaultAssetLevelForType("Pump Set")).toBe("MAIN_ASSET"); });
 it("never permits Instrument root System", () => { expect(isValidAssetSystemName("Instrument")).toBe(false); expect(isValidAssetSystemName("instrument system")).toBe(false); expect(isValidAssetSystemName("Boiler & Combustion")).toBe(true); });
 it("removes only trailing zone marker", () => { expect(cleanAssetName("Pressure Transmitter PT-3001 Z08b")).toBe("Pressure Transmitter PT-3001"); expect(cleanAssetName("Pump Z08b East")).toBe("Pump Z08b East"); });
});
