import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import XLSX from "xlsx";

export type AssetR8Level = "MAIN_ASSET" | "SUB_ASSET" | "PART";

export type PreparedAssetR8Row = {
  id: string;
  sourceSheet: string;
  sourceRows: number[];
  code: string;
  name: string;
  systemName: string;
  zoneName: string;
  assetType: string;
  assetLevel: AssetR8Level;
  parentId: string | null;
  parentCode: string | null;
  discipline: string;
  criticality: "HIGH" | "MEDIUM" | "LOW";
  operatingStatus: "IN_SERVICE";
  registrationStatus: "ACTIVE";
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  keySpecification: string | null;
};

type SourceRow = Record<string, unknown> & { __sheet: string; __row: number };

const SYSTEM_CODES: Record<string, string> = {
  "Fuel Handling": "FUH",
  Combustion: "COM",
  Boiler: "BOL",
  "ASH Handling": "ASH",
  "Steam Turbine": "STB",
  "Water Treatment": "WTR",
  ESP: "ESP",
  "Cooling water": "CWT",
  Vehicle: "VEH",
  Utility: "UTL",
  "Electrical Cabinet": "ELC",
  Instrument: "INS",
  "Control Valve": "CTV",
};

const TYPE_CODES: Record<string, string> = {
  Machine: "MAC",
  "Solenoid valve": "SLV",
  Motor: "MOT",
  Fan: "FAN",
  "Swing Plate": "SWP",
  Proximity: "PRX",
  Gear: "GEA",
  Impeller: "IMP",
  Pump: "PUM",
  Tube: "TUB",
  Barring: "BAR",
  Seal: "SEA",
  Tank: "TNK",
  "Oil Cooler": "OCL",
  Filter: "FIL",
  Transformer: "TRF",
  Cabinet: "CAB",
  Heater: "HTR",
  Vehicle: "VEH",
  Instrument: "INS",
  "Control Valve": "CTV",
};

const MISSING_CODES: Record<string, string> = {
  "Combustion:Deaerator": "MA-DEA-001",
  "Combustion:Steam Drum": "MA-CDR-001",
  "Combustion:Steam Header": "MA-STH-001",
  "Combustion:Boiler Pressure Part": "MA-BPP-001",
  "Combustion:Vibrating Grate Unit": "MA-VGU-001",
};

const INSTRUMENT_MERGES: Record<string, { name: string; keySpecification: string }> = {
  LT3201: { name: "LT3201 Level deaerator", keySpecification: "Set point; Actual" },
  FT3002: { name: "FT3002 Main steam flow", keySpecification: "Flow; Totalizer" },
  "PT-110": { name: "PT-110 Inlet steam pressure", keySpecification: "Alarm: Low, Very Low" },
  "TI-110": { name: "TI-110 Inlet steam temperature", keySpecification: "Alarm: Low, Very Low, High, Very High" },
  "TI-150": { name: "TI-150 Exhaust steam temperature", keySpecification: "Alarm: High, Very High" },
};

const text = (value: unknown) => {
  const result = String(value ?? "").trim();
  return result && result !== "-" ? result : null;
};

function normalizeSystem(value: unknown, sheet: string) {
  const system = text(value) || (sheetlish(sheet) === "UTILITY" ? "Utility" : null);
  if (!system) throw new Error(`ไม่พบ System ในชีต ${sheet}`);
  return /^ash handing$/i.test(system) ? "ASH Handling" : system;
}

function sheetlish(value: string) {
  return value.trim().toUpperCase();
}

function normalizeZone(value: unknown) {
  const zone = text(value);
  if (!zone) throw new Error("ไม่พบ Area / Zone");
  if (/^boiler&combustion$/i.test(zone)) return "Boiler&Combustion";
  if (/^ash handing$/i.test(zone)) return "ASH Handling";
  if (/^water treatment(?: plant)?$/i.test(zone)) return "Water Treatment";
  return zone;
}

function nameAndLevel(row: SourceRow) {
  const values = [
    ["MAIN ASSET", "MAIN_ASSET"],
    ["SUB-ASSET", "SUB_ASSET"],
    ["PART-ASSET", "PART"],
  ] as const;
  const populated = values.flatMap(([column, level]) => text(row[column]) ? [{ name: text(row[column])!, level }] : []);
  if (populated.length !== 1) throw new Error(`${row.__sheet} แถว ${row.__row}: ต้องมีชื่อ Asset เพียงหนึ่งระดับ`);
  return populated[0];
}

function abbreviationFor(system: string, name: string) {
  if (system === "Fuel Handling" && /spreader air fan/i.test(name)) return "SPF";
  if (system === "Water Treatment" && /anti[- ]scale dosing pump/i.test(name)) return "WAP";
  if (system === "Cooling water" && /anti[- ]scale dosing pump/i.test(name)) return "CAP";
  if (system === "Cooling water" && /condensate pump/i.test(name)) return "CNP";
  if (system === "Water Treatment" && /caustic dosing pump/i.test(name)) return "CSD";
  if (system === "Cooling water" && /chlorine dosing pump/i.test(name)) return "CLP";
  if (system === "Electrical Cabinet" && /main feeder acdp/i.test(name)) return "MFA";
  if (system === "Utility" && /air compressor/i.test(name)) return "ACR";
  return null;
}

function normalizeCode(row: SourceRow, system: string, name: string, level: AssetR8Level) {
  let code = text(row["CODE ASSET"])?.toUpperCase() || MISSING_CODES[`${system}:${name}`];
  if (!code) throw new Error(`${row.__sheet} แถว ${row.__row}: ไม่พบ CODE ASSET`);
  const tagStyle = system === "Instrument" || system === "Control Valve";
  if (!tagStyle && level === "SUB_ASSET" && code.startsWith("MA-")) code = `SA-${code.slice(3)}`;
  if (!tagStyle && level === "MAIN_ASSET" && code.startsWith("MC-")) code = `MA-${code.slice(3)}`;
  if (row.__sheet.trim() === "ESP" && level === "SUB_ASSET" && /Cell 0?3\b/i.test(name)) code = code.replace(/^SA-ESP-002-/, "SA-ESP-003-");
  const abbreviation = abbreviationFor(system, name);
  if (abbreviation) code = code.replace(/^((?:MA|SA|PA)-)[A-Z0-9]{3}(?=-)/, `$1${abbreviation}`);
  return code;
}

function assetId(code: string) {
  return `asset-r8-${createHash("sha256").update(code).digest("hex").slice(0, 24)}`;
}

function codeTail(code: string) {
  return code.replace(/^(?:MA|SA|PA)-/, "");
}

export function prepareAssetR8(sourceRows: SourceRow[]) {
  let currentMainBySheet = new Map<string, string>();
  const preliminary = sourceRows.map(row => {
    const { name, level } = nameAndLevel(row);
    const systemName = normalizeSystem(row.SYSTEM, row.__sheet);
    const code = normalizeCode(row, systemName, name, level);
    if (level === "MAIN_ASSET") currentMainBySheet.set(row.__sheet, code);
    return {
      row,
      code,
      name,
      assetLevel: level,
      systemName,
      zoneName: normalizeZone(row["AREA / ZONE"]),
      parentHint: level === "SUB_ASSET" && (systemName === "Instrument" || systemName === "Control Valve") ? currentMainBySheet.get(row.__sheet) || null : null,
    };
  });

  const grouped = new Map<string, typeof preliminary>();
  for (const item of preliminary) grouped.set(item.code, [...(grouped.get(item.code) || []), item]);
  const merged = [...grouped.entries()].map(([code, items]) => {
    const merge = INSTRUMENT_MERGES[code];
    if (items.length > 1 && !merge) throw new Error(`CODE ASSET ซ้ำหลัง Normalize: ${code}`);
    const first = items[0];
    return {
      ...first,
      name: merge?.name || first.name,
      keySpecification: merge?.keySpecification || text(first.row["KEY SPECIFICATION"]),
      sourceRows: items.map(item => item.row.__row),
    };
  });

  const parents = merged.filter(row => row.assetLevel !== "PART");
  const findParentCode = (row: typeof merged[number]) => {
    if (row.assetLevel === "MAIN_ASSET") return null;
    if (row.parentHint) return row.parentHint;
    const tail = codeTail(row.code);
    const levels = row.assetLevel === "SUB_ASSET" ? new Set<AssetR8Level>(["MAIN_ASSET"]) : new Set<AssetR8Level>(["MAIN_ASSET", "SUB_ASSET"]);
    const candidates = parents.filter(candidate => candidate.systemName === row.systemName && levels.has(candidate.assetLevel) && tail.startsWith(`${codeTail(candidate.code)}-`));
    candidates.sort((left, right) => codeTail(right.code).length - codeTail(left.code).length);
    if (candidates.length > 1 && codeTail(candidates[0].code).length === codeTail(candidates[1].code).length) throw new Error(`Parent Code ไม่ชัดเจน: ${row.code}`);
    if (row.assetLevel === "SUB_ASSET" && !candidates.length) throw new Error(`ไม่พบ Main Asset ของ ${row.code}`);
    return candidates[0]?.code || null;
  };

  const prepared: PreparedAssetR8Row[] = merged.map(item => {
    const parentCode = findParentCode(item);
    return {
      id: assetId(item.code),
      sourceSheet: item.row.__sheet.trim(),
      sourceRows: item.sourceRows,
      code: item.code,
      name: item.name,
      systemName: item.systemName,
      zoneName: item.zoneName,
      assetType: text(item.row["ASSET TYPE"]) || "Machine",
      assetLevel: item.assetLevel,
      parentId: parentCode ? assetId(parentCode) : null,
      parentCode,
      discipline: text(item.row.DISCIPLINE) || "Mechanical",
      criticality: ({ A: "HIGH", B: "MEDIUM", C: "LOW" } as const)[(text(item.row.CRITICALITY)?.toUpperCase() || "B") as "A" | "B" | "C"],
      operatingStatus: "IN_SERVICE",
      registrationStatus: "ACTIVE",
      manufacturer: text(item.row.MANUFACTURER),
      model: text(item.row["MODEL / TYPE"]),
      serialNumber: text(item.row["SERIAL NO."]),
      keySpecification: item.keySpecification,
    };
  });

  const codes = new Set(prepared.map(row => row.code));
  if (codes.size !== prepared.length) throw new Error("CODE ASSET ยังซ้ำหลังเตรียมข้อมูล");
  for (const row of prepared) if (row.parentCode && !codes.has(row.parentCode)) throw new Error(`ไม่พบ Parent ${row.parentCode}`);
  return prepared;
}

export function loadAssetR8(path: string) {
  const source = readFileSync(path);
  const workbook = XLSX.read(source, { type: "buffer", cellDates: true });
  const rows = (workbook.SheetNames as string[]).flatMap((sheetName: string) => {
    const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null }) as Array<Record<string, unknown>>;
    return sheetRows.flatMap((row, index) => ["MAIN ASSET", "SUB-ASSET", "PART-ASSET"].some(column => text(row[column])) ? [{ ...row, __sheet: sheetName, __row: index + 2 } as SourceRow] : []);
  });
  return {
    sourceSha256: createHash("sha256").update(source).digest("hex"),
    rows: prepareAssetR8(rows),
  };
}

export function assetR8SystemCode(name: string) {
  const code = SYSTEM_CODES[name];
  if (!code) throw new Error(`ยังไม่มี System Code สำหรับ ${name}`);
  return code;
}

export function assetR8TypeCode(name: string) {
  const code = TYPE_CODES[name];
  if (!code) throw new Error(`ยังไม่มี Asset Type Code สำหรับ ${name}`);
  return code;
}
