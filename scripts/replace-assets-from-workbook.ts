import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import XLSX from "xlsx";
import { db } from "../lib/db";
import { cleanAssetName, defaultAssetLevelForType, isInstrumentType, isValveType, normalizeAssetTypeName } from "../modules/assets/asset-hierarchy";
import { LEGACY_ASSET_CODE_EXCEPTIONS, STANDARD_ASSET_CODE } from "../modules/assets/asset-service";

const SOURCE_PATH = "prisma/data/PowerCare_Asset_Review_20260905.xlsx";
const CM_MAPPING_PATH = "prisma/data/production-cm-asset-mapping.csv";
const CM_SUPPLEMENT_PATH = "prisma/data/production-cm-missing-assets.csv";
const commit = process.argv.includes("--commit");
const plantCode = process.argv.find(argument => argument.startsWith("--plant-code="))?.split("=")[1] || "RTB";

const SYSTEM_CODES: Record<string, string> = {
  "Ash Handling": "ASH", "Boiler & Combustion": "BOC", "Compressed Air": "CAI",
  "Condensate & Feedwater": "CFW", "Control & Automation": "CTA", "Cooling Water": "CWT",
  "ESP & Flue Gas Cleaning": "ESP", "Electrical Power": "ELP", "Fire Protection": "FIR",
  "Fuel Handling": "FUH", "General Water": "GWT", "Mobile & Heavy Equipment": "MHE",
  "Steam Turbine": "STB", "Tools & Workshop Equipment": "TWE", "Water Treatment": "WTR",
};

const TYPE_ALIASES: Record<string, string> = {
  BOILER: "Boiler", CONDENSER: "Condenser", FILTER: "Filter", "MOVING FLOOR": "Moving Floor",
  "SCREW CONVEYOR": "Conveyor", SCREENER: "Screener", RO: "RO Unit", Valve: "Manual Valve",
};

const TYPE_CODES: Record<string, string> = {
  "Manual Valve": "MNV", Motor: "MOT", Pump: "PUM", "Mechanical Equipment": "MEQ",
  Conveyor: "CNV", Gearbox: "GEB", Bearing: "BRG", Chain: "CHN", Blower: "BLW",
  "Control Valve": "CVL", "Pressure Transmitter": "PTT", "Cooling Tower": "CTW", Fan: "FAN",
  "Moving Floor": "MVF", "Safety Valve": "SFV", "Air Compressor": "ACO", "Heavy Equipment": "HEQ",
  Tank: "TNK", "Rotary Air Lock": "RAL", Tool: "TOL", "Differential Pressure Transmitter": "DPT",
  MCC: "MCC", "Pressure Instrument": "PIN", "ESP Equipment": "ESE", Filter: "FLT",
  Switchgear: "SWG", Transformer: "TRF", Boiler: "BOL", "Level Transmitter": "LTT",
  "Pressure Gauge": "PGG", "Pressure Regulating Valve": "PRV", "RO Unit": "ROU", "Air Dryer": "ADR",
  Condenser: "CND", Coupling: "CPL", Drum: "DRM", EDI: "EDI", "Ef-Machine": "EFM",
  "Excavator / Backhoe": "EXC", Feeder: "FDR", Loader: "LDR", MDB: "MDB", Mixer: "MIX",
  "Remote I/O": "RIO", "Screw Feeder": "SCF", "Temperature Transmitter": "TMT", Workstation: "WKS",
  Actuator: "ACT", "Battery Charger": "BCH", "Control Network": "CTN", Crane: "CRN",
  Deaerator: "DEA", "Electrical Equipment": "EEQ", "Field Control Unit": "FCU", Forklift: "FRK",
  Generator: "GEN", Pulley: "PLY", Screener: "SCR", Seal: "SEL", Shaft: "SFT", Shredder: "SHR",
  "Steam Drum": "STD", "Steam Header": "STH", UPS: "UPS",
};

type SourceRow = Record<string, unknown> & { __sheet: string; __row: number };
type PreparedRow = {
  id: string; sourceParent: string | null; parentId: string | null; code: string; sourceCode: string | null;
  codeOrigin: "APPROVED" | "ARC_EXCEPTION" | "GENERATED"; name: string; systemName: string | null;
  area: string | null; assetType: string; typeCode: string; assetLevel: "MAIN_ASSET" | "SUB_ASSET" | "PART";
  discipline: string; tagKks: string | null; registrationCode: string | null; criticality: string;
  operatingStatus: string; registrationStatus: string; manufacturer: string | null; model: string | null;
  serialNumber: string | null; keySpecification: string | null; metadataJson: string; migrationStatus: string;
  issues: string[];
};

function text(value: unknown) {
  const result = String(value ?? "").trim();
  return !result || result === "-" ? null : result;
}
function normalizeType(row: SourceRow) {
  const raw = text(row["Asset Type"]) || "Mechanical Equipment";
  if (raw === "Bearing & Chain") return /chain/i.test(text(row["Asset Name"]) || "") ? "Chain" : "Bearing";
  return TYPE_ALIASES[raw] || normalizeAssetTypeName(raw);
}
function normalizeLevel(value: unknown): PreparedRow["assetLevel"] {
  const level = String(value ?? "").trim().toUpperCase().replace(/[ -]/g, "_");
  return level === "SUB_ASSET" ? "SUB_ASSET" : level === "PART" ? "PART" : "MAIN_ASSET";
}
function mapCriticality(value: unknown) {
  const level = String(value ?? "").trim().toUpperCase();
  return ({ A: "CRITICAL", B: "HIGH", C: "MEDIUM", D: "LOW", CRITICAL: "CRITICAL", HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" } as Record<string, string>)[level] || "MEDIUM";
}
function mapStatus(value: unknown) {
  const status = String(value ?? "").trim().toUpperCase();
  if (["INACTIVE", "RETIRED"].includes(status)) return { operatingStatus: "RETIRED", registrationStatus: "CANCELED" };
  if (status === "STANDBY") return { operatingStatus: "STANDBY", registrationStatus: "ACTIVE" };
  return { operatingStatus: "IN_SERVICE", registrationStatus: "ACTIVE" };
}
function loadRows() {
  const workbook = XLSX.readFile(SOURCE_PATH, { cellDates: true });
  return (workbook.SheetNames as string[]).flatMap((sheetName: string) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null }) as Array<Record<string, unknown>>;
    if (!rows.length || !("Asset ID" in rows[0]) || !("Asset Type" in rows[0])) return [];
    return rows.flatMap((row: Record<string, unknown>, index: number) => text(row["Asset ID"]) ? [{ ...row, __sheet: sheetName, __row: index + 2 }] : []);
  });
}
function loadSupplementalCmRows() {
  const workbook = XLSX.readFile(CM_SUPPLEMENT_PATH);
  const records = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null }) as Array<Record<string, unknown>>;
  return records.flatMap((row, index) => text(row["Asset ID"]) ? [{ ...row, __sheet: "Production CM supplement", __row: index + 2 } as SourceRow] : []);
}

function prepare(sourceRows: SourceRow[]) {
  const ids = new Set<string>();
  for (const row of sourceRows) {
    const id = text(row["Asset ID"])!;
    if (ids.has(id)) throw new Error(`Asset ID ซ้ำ: ${id}`);
    ids.add(id);
  }
  const rotaryIds = sourceRows.filter(row => normalizeType(row) === "Rotary Air Lock").map(row => text(row["Asset ID"])!).sort();
  if (rotaryIds.length !== 7) throw new Error(`Rotary Air Lock ต้องมี 7 รายการ แต่พบ ${rotaryIds.length}`);
  const rotaryCode = new Map(rotaryIds.map((id, index) => [id, `MC-ARC-${5001 + index}`]));
  const usedCodes = new Set<string>();
  const sourceCodeToId = new Map<string, string>();
  const preliminary = sourceRows.map(row => {
    const id = text(row["Asset ID"])!;
    const sourceCode = text(row["Registration Code"])?.toUpperCase() || null;
    if (sourceCode) sourceCodeToId.set(sourceCode, id);
    const approved = sourceCode && STANDARD_ASSET_CODE.test(sourceCode) && normalizeType(row) !== "Rotary Air Lock" ? sourceCode : rotaryCode.get(id) || null;
    if (approved && usedCodes.has(approved)) throw new Error(`Asset Code ซ้ำ: ${approved}`);
    if (approved) usedCodes.add(approved);
    return { row, id, sourceCode, approved };
  });
  const nextByType = new Map<string, number>();
  for (const code of usedCodes) {
    const match = /^MC-([A-Z]{3})-(\d{3})$/.exec(code);
    if (match) nextByType.set(match[1], Math.max(nextByType.get(match[1]) || 0, Number(match[2])));
  }
  const prepared: PreparedRow[] = preliminary.map(item => {
    const assetType = normalizeType(item.row);
    const typeCode = TYPE_CODES[assetType];
    if (!typeCode) throw new Error(`ยังไม่มี Type Code สำหรับ ${assetType}`);
    let code = item.approved;
    let codeOrigin: PreparedRow["codeOrigin"] = item.approved ? (LEGACY_ASSET_CODE_EXCEPTIONS.has(item.approved) ? "ARC_EXCEPTION" : "APPROVED") : "GENERATED";
    if (!code) {
      let next = nextByType.get(typeCode) || 0;
      do { next += 1; code = `MC-${typeCode}-${String(next).padStart(3, "0")}`; } while (usedCodes.has(code));
      if (next > 999) throw new Error(`Asset Code ${typeCode} เกิน 999`);
      nextByType.set(typeCode, next); usedCodes.add(code);
    }
    const discipline = text(item.row["Discipline"]) || "Mechanical";
    let assetLevel = normalizeLevel(item.row["Asset Level"]);
    if (discipline.toLowerCase() === "instrument" || isInstrumentType(assetType) || isValveType(assetType) || defaultAssetLevelForType(assetType) === "PART") assetLevel = "PART";
    const rawSystem = text(item.row["System"]);
    const systemName = rawSystem && rawSystem !== "Valve" ? rawSystem : null;
    const status = mapStatus(item.row["Status"]);
    const metadata = {
      sourceAssetId: item.id, sourceSheet: item.row.__sheet, sourceRow: item.row.__row,
      subSystem: text(item.row["Sub-System"]), reviewNote: text(item.row["Review Note"]),
      powerKw: text(item.row["Power (kW)"]), voltageV: text(item.row["Voltage (V)"]), currentA: text(item.row["Current (A)"]),
      speedRpm: text(item.row["Speed (rpm)"]), bearingDe: text(item.row["Bearing DE"]), bearingNde: text(item.row["Bearing NDE"]),
      ipRating: text(item.row["IP Rating"]), originalSystem: rawSystem,
    };
    return {
      id: item.id, sourceParent: text(item.row["Parent Asset ID"]), parentId: null, code, sourceCode: item.sourceCode,
      codeOrigin, name: cleanAssetName(text(item.row["Asset Name"]) || item.id), systemName, area: text(item.row["Area"]),
      assetType, typeCode, assetLevel, discipline, tagKks: text(item.row["Tag / KKS"]), registrationCode: item.sourceCode,
      criticality: mapCriticality(item.row["Criticality"]), ...status, manufacturer: text(item.row["Manufacturer"]),
      model: text(item.row["Model / Type"]), serialNumber: text(item.row["Serial No."]), keySpecification: text(item.row["Key Specification"]),
      metadataJson: JSON.stringify(metadata), migrationStatus: "READY", issues: [],
    };
  });
  const byId = new Map(prepared.map(row => [row.id, row]));
  const byCode = new Map(prepared.map(row => [row.code, row]));
  for (const [sourceCode, id] of sourceCodeToId) if (!byCode.has(sourceCode)) byCode.set(sourceCode, byId.get(id)!);
  for (const row of prepared) {
    if (row.sourceParent) row.parentId = byId.get(row.sourceParent)?.id || byCode.get(row.sourceParent)?.id || null;
    const parent = row.parentId ? byId.get(row.parentId) : null;
    if (parent?.systemName) row.systemName = parent.systemName;
    if (row.assetLevel === "MAIN_ASSET") row.parentId = null;
    if (!row.systemName) row.issues.push("SYSTEM_REQUIRED");
    if (row.assetLevel !== "MAIN_ASSET" && !row.parentId) row.issues.push("PARENT_REQUIRED");
    if (row.assetLevel === "SUB_ASSET" && parent?.assetLevel !== "MAIN_ASSET") row.issues.push("INVALID_PARENT_LEVEL");
    if (row.assetLevel === "PART" && parent && !["MAIN_ASSET", "SUB_ASSET"].includes(parent.assetLevel)) row.issues.push("INVALID_PARENT_LEVEL");
    if (parent && row.systemName !== parent.systemName) row.issues.push("CROSS_SYSTEM_PARENT");
    if (row.issues.length) { row.parentId = null; row.migrationStatus = row.issues.includes("PARENT_REQUIRED") ? "NEED_PARENT_REVIEW" : "NEED_REVIEW"; }
  }
  const parents = new Set(prepared.flatMap(row => row.parentId ? [row.parentId] : []));
  for (const row of prepared) if (row.assetLevel === "PART" && parents.has(row.id)) throw new Error(`Part มีลูก: ${row.code}`);
  return prepared;
}

function loadConfirmedCmMapping() {
  const workbook = XLSX.readFile(CM_MAPPING_PATH);
  const records = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null }) as Array<Record<string, unknown>>;
  return new Map<string, string>(records.filter(record => text(record.match_status) === "CONFIRMED").map(record => {
    const oldAssetId = text(record.old_asset_id);
    const newAssetId = text(record.new_asset_id);
    if (!oldAssetId || !newAssetId) throw new Error("Confirmed CM mapping requires old_asset_id and new_asset_id");
    return [oldAssetId, newAssetId];
  }));
}

async function replaceAssets(rows: PreparedRow[]) {
  const plant = await db.plant.findFirstOrThrow({ where: { code: plantCode, active: true } });
  const systemNames = [...new Set(rows.flatMap(row => row.systemName ? [row.systemName] : []))].sort();
  const areaNames = [...new Set(rows.flatMap(row => row.area ? [row.area] : []))].sort();
  const typeNames = [...new Set(rows.map(row => row.assetType))].sort();
  const disciplines = [...new Set(rows.map(row => row.discipline || "Mechanical"))].sort();
  const confirmedCmMapping = loadConfirmedCmMapping();
  const incomingIds = new Set(rows.map(row => row.id));
  for (const newAssetId of confirmedCmMapping.values()) if (!incomingIds.has(newAssetId)) throw new Error(`CM mapping target not found in workbook: ${newAssetId}`);
  return db.$transaction(async tx => {
    const legacyCmLinks = await tx.cmWork.findMany({
      where: { asset: { plantId: plant.id } },
      select: { id: true, assetId: true, asset: { select: { code: true, nameTh: true, nameEn: true } } },
    });    const unmappedLegacyAssetIds = [...new Set(legacyCmLinks.flatMap(link => link.assetId && !confirmedCmMapping.has(link.assetId) ? [link.assetId] : []))];
    if (unmappedLegacyAssetIds.length) throw new Error(`พบ CM ที่ยังไม่มี Asset mapping: ${unmappedLegacyAssetIds.join(", ")}`);
    for (const link of legacyCmLinks) {
      await tx.cmWork.update({
        where: { id: link.id },
        data: { assetId: null, assetCodeSnapshot: link.asset?.code || null, assetNameSnapshot: link.asset?.nameTh || link.asset?.nameEn || null },
      });
    }
    await tx.pmGroupAsset.deleteMany({ where: { plantId: plant.id } });
    await tx.cmWork.updateMany({ where: { originatingPmWork: { plantId: plant.id } }, data: { originatingPmWorkId: null } });
    await tx.pmWorkAssignee.deleteMany({ where: { pmWork: { plantId: plant.id } } });
    await tx.pmWorkSourceGroup.deleteMany({ where: { pmWork: { plantId: plant.id } } });
    await tx.pmWork.deleteMany({ where: { plantId: plant.id } });
    await tx.asset.updateMany({ where: { plantId: plant.id }, data: { parentId: null } });
    await tx.asset.deleteMany({ where: { plantId: plant.id } });
    await tx.assetCodeSequence.deleteMany({ where: { plantId: plant.id } });
    await tx.assetSequence.deleteMany({ where: { plantId: plant.id } });
    await tx.assetTechnicalField.deleteMany({ where: { assetType: { plantId: plant.id } } });
    await tx.assetType.deleteMany({ where: { plantId: plant.id } });
    await tx.assetFamily.deleteMany({ where: { plantId: plant.id } });
    await tx.assetClass.deleteMany({ where: { plantId: plant.id } });
    await tx.assetSystem.deleteMany({ where: { plantId: plant.id } });

    const systemIds = new Map(systemNames.map(name => [name, randomUUID()]));
    await tx.assetSystem.createMany({ data: systemNames.map((name, sortOrder) => ({ id: systemIds.get(name)!, plantId: plant.id, code: SYSTEM_CODES[name] || `S${String(sortOrder + 1).padStart(2, "0")}`, nameTh: name, nameEn: name, sortOrder })) });
    const classIds = new Map(disciplines.map(name => [name, randomUUID()]));
    await tx.assetClass.createMany({ data: disciplines.map(name => ({ id: classIds.get(name)!, plantId: plant.id, nameTh: name, nameEn: name })) });
    const dominantDiscipline = new Map(typeNames.map(type => {
      const counts = new Map<string, number>(); for (const row of rows.filter(row => row.assetType === type)) counts.set(row.discipline, (counts.get(row.discipline) || 0) + 1);
      return [type, [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]];
    }));
    const typeIds = new Map(typeNames.map(name => [name, randomUUID()]));
    await tx.assetType.createMany({ data: typeNames.map(name => ({ id: typeIds.get(name)!, plantId: plant.id, assetClassId: classIds.get(dominantDiscipline.get(name)!)!, code: TYPE_CODES[name], nameTh: name, nameEn: name, discipline: dominantDiscipline.get(name), defaultLevel: defaultAssetLevelForType(name) })) });
    const zones = new Map<string, string>();
    for (const name of areaNames) {
      const zone = await tx.zone.upsert({ where: { plantId_name: { plantId: plant.id, name } }, create: { plantId: plant.id, name, active: true }, update: { active: true } });
      zones.set(name, zone.id);
    }
    await tx.asset.createMany({ data: rows.map(row => ({
      id: row.id, publicToken: randomUUID(), plantId: plant.id, systemId: row.systemName ? systemIds.get(row.systemName) : null,
      assetClassId: classIds.get(row.discipline)!, assetTypeId: typeIds.get(row.assetType)!, zoneId: row.area ? zones.get(row.area) : null,
      parentId: null, code: row.code, assetLevel: row.assetLevel, discipline: row.discipline, tagKks: row.tagKks,
      registrationCode: row.registrationCode, keySpecification: row.keySpecification, metadataJson: row.metadataJson,
      nameTh: row.name, nameEn: row.name, manufacturer: row.manufacturer, model: row.model, serialNumber: row.serialNumber,
      serialNormalized: row.serialNumber?.replace(/\s+/g, "").toUpperCase() || null, operatingStatus: row.operatingStatus,
      criticality: row.criticality, registrationStatus: row.registrationStatus, migrationStatus: row.migrationStatus,
    })) });
    for (const row of rows) {
      if (row.parentId) await tx.asset.update({ where: { id: row.id }, data: { parentId: row.parentId } });
    }
    let remappedCmWorks = 0;
    for (const link of legacyCmLinks) {
      const targetAssetId = link.assetId ? confirmedCmMapping.get(link.assetId) : null;
      if (!targetAssetId) continue;
      await tx.cmWork.update({ where: { id: link.id }, data: { assetId: targetAssetId } });
      remappedCmWorks += 1;
    }
    const sequenceRows = typeNames.map(name => {
      const typeCode = TYPE_CODES[name];
      const max = Math.max(0, ...rows.map(row => new RegExp(`^MC-${typeCode}-(\\d{3})$`).exec(row.code)).filter(Boolean).map(match => Number(match![1])));
      return { plantId: plant.id, typeCode, lastNumber: max };
    });
    await tx.assetCodeSequence.createMany({ data: sequenceRows });
    const [assets, duplicateCodes, invalidParents] = await Promise.all([
      tx.asset.count({ where: { plantId: plant.id } }),
      tx.$queryRaw<Array<{ code: string; count: bigint }>>`SELECT "code", COUNT(*) AS "count" FROM "Asset" WHERE "plantId" = ${plant.id} GROUP BY "code" HAVING COUNT(*) > 1`,
      tx.$queryRaw<Array<{ id: string }>>`SELECT child."id" FROM "Asset" child LEFT JOIN "Asset" parent ON parent."id" = child."parentId" AND parent."plantId" = child."plantId" WHERE child."plantId" = ${plant.id} AND child."parentId" IS NOT NULL AND parent."id" IS NULL`,
    ]);
    if (assets !== rows.length || duplicateCodes.length || invalidParents.length) throw new Error("Asset replacement verification failed");
    return { plant: plant.code, assets, systems: systemNames.length, areas: areaNames.length, types: typeNames.length, legacyCmWorks: legacyCmLinks.length, remappedCmWorks, snapshotOnlyCmWorks: legacyCmLinks.length - remappedCmWorks };
  }, { maxWait: 30_000, timeout: 600_000 });
}

async function main() {
  const source = readFileSync(SOURCE_PATH);
  const rows = prepare([...loadRows(), ...loadSupplementalCmRows()]);
  const counts = (key: keyof PreparedRow) => Object.fromEntries([...new Set(rows.map(row => String(row[key])))].sort().map(value => [value, rows.filter(row => String(row[key]) === value).length]));
  const report = {
    mode: commit ? "REPLACE" : "DRY_RUN", source: SOURCE_PATH, sourceSha256: createHash("sha256").update(source).digest("hex"),
    assets: rows.length, uniqueCodes: new Set(rows.map(row => row.code)).size, systems: new Set(rows.flatMap(row => row.systemName ? [row.systemName] : [])).size,
    areas: new Set(rows.flatMap(row => row.area ? [row.area] : [])).size, types: new Set(rows.map(row => row.assetType)).size,
    codeOrigins: counts("codeOrigin"), levels: counts("assetLevel"), migrationStatus: counts("migrationStatus"),
    controlValve: rows.filter(row => row.assetType === "Control Valve").length,
    pressureRegulatingValve: rows.filter(row => row.assetType === "Pressure Regulating Valve").length,
    unresolvedCount: rows.filter(row => row.migrationStatus !== "READY").length,
    unresolvedIssues: Object.fromEntries([...new Set(rows.flatMap(row => row.issues))].sort().map(issue => [issue, rows.filter(row => row.issues.includes(issue)).length])),
    unresolvedSample: rows.filter(row => row.migrationStatus !== "READY").slice(0, 20).map(row => ({ id: row.id, code: row.code, name: row.name, issues: row.issues })),
  };
  if (!commit) { console.log(JSON.stringify(report, null, 2)); return; }
  const result = await replaceAssets(rows);
  console.log(JSON.stringify({ ...report, result }, null, 2));
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(() => db.$disconnect());
