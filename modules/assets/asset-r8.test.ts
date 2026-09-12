import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isAllowedAssetCode } from "./asset-service";
import { loadAssetR8 } from "./asset-r8";

const workbookPath = resolve(process.cwd(), "prisma/data/assets-rungtiva-sol-r8.xlsx");
const result = loadAssetR8(workbookPath);
const rows = result.rows;
const byCode = new Map(rows.map(row => [row.code, row]));

describe("Assets R8 workbook contract", () => {
  it("uses the reviewed workbook unchanged", () => {
    expect(result.sourceSha256).toBe("711ed08fba13865200e2b8c4c112c1f091d50f428e1f936cac670623d30f2978");
    expect(rows).toHaveLength(583);
    expect(new Set(rows.map(row => row.code)).size).toBe(583);
  });

  it("produces the approved levels, Systems, Zones, and Asset Types", () => {
    expect(Object.fromEntries(["MAIN_ASSET", "SUB_ASSET", "PART"].map(level => [level, rows.filter(row => row.assetLevel === level).length]))).toEqual({ MAIN_ASSET: 188, SUB_ASSET: 367, PART: 28 });
    expect(new Set(rows.map(row => row.systemName)).size).toBe(13);
    expect(new Set(rows.map(row => row.zoneName))).toEqual(new Set(["Fuel preparation", "Boiler&Combustion", "ASH Handling", "Turbine", "Water Treatment", "ESP", "Cooling Tower", "Vehicle"]));
    expect(new Set(rows.map(row => row.assetType)).size).toBe(21);
    expect(rows.every(row => isAllowedAssetCode(row.code, row.systemName))).toBe(true);
  });

  it("builds parents from the code while allowing approved System-level Parts", () => {
    expect(byCode.get("SA-GVC-001-01")?.parentCode).toBe("MA-GVC-001");
    expect(byCode.get("PA-GVC-001-02")?.parentCode).toBe("MA-GVC-001");
    expect(rows.filter(row => row.assetLevel === "PART" && row.parentId)).toHaveLength(21);
    expect(rows.filter(row => row.assetLevel === "PART" && !row.parentId).map(row => row.code)).toEqual(["PA-OTS-001", "PA-OCL-001", "PA-OCL-002", "PA-LOF-001", "PA-LOF-002", "PA-COF-001", "PA-COF-002"]);
    expect(rows.filter(row => row.assetLevel === "SUB_ASSET" && !row.parentId)).toHaveLength(0);
  });

  it("keeps Instrument and Control Valve tag codes under their intended Main Assets", () => {
    expect(byCode.get("DPT2001")).toMatchObject({ name: "DPT2001 Furnace pressure A", systemName: "Instrument", parentCode: "MA-INB-001" });
    expect(byCode.get("CV-3009")).toMatchObject({ systemName: "Control Valve", parentCode: "MA-CTV-001" });
  });

  it("merges repeated Instrument tags with the approved specifications", () => {
    expect(byCode.get("LT3201")).toMatchObject({ sourceRows: [9, 10], keySpecification: "Set point; Actual" });
    expect(byCode.get("FT3002")?.keySpecification).toBe("Flow; Totalizer");
    expect(byCode.get("PT-110")?.keySpecification).toBe("Alarm: Low, Very Low");
    expect(byCode.get("TI-110")?.keySpecification).toBe("Alarm: Low, Very Low, High, Very High");
    expect(byCode.get("TI-150")?.keySpecification).toBe("Alarm: High, Very High");
  });

  it("applies reviewed code corrections without changing running numbers", () => {
    for (const code of ["SA-ESP-003-01", "SA-ESP-003-02", "SA-ESP-003-03", "MA-DEA-001", "MA-CDR-001", "MA-STH-001", "MA-BPP-001", "MA-VGU-001"]) expect(byCode.has(code)).toBe(true);
    expect(rows.some(row => row.code === "SA-ESP-002-02" && /Cell 03/i.test(row.name))).toBe(false);
  });

  it("preserves location text that belongs to machine names", () => {
    expect(byCode.get("MA-MDB-001")?.name).toBe("MDB-01 @Control Room");
  });
});
