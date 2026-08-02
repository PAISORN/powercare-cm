import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

type SourceRow = {
  sourceRow: number;
  assetClass: unknown;
  zone: unknown;
  family: unknown;
  assetTypeCode: unknown;
  assetTypeName: unknown;
  name: unknown;
  manufacturer: unknown;
  model: unknown;
  serialNumber: unknown;
  technical: Record<string, unknown>;
};

const db = new PrismaClient();
const inputPath = path.resolve(".tmp-motor-import/motor-data.json");
const commit = process.argv.includes("--commit");

const clean = (value: unknown) => {
  const text = String(value ?? "").trim();
  return !text || text === "-" ? null : text;
};
const normalizedType = (row: SourceRow) => {
  const name = clean(row.assetTypeName)?.toUpperCase();
  return name === "TRANSFORMER"
    ? { code: "TRF", name: "Transformer" }
    : { code: clean(row.assetTypeCode)?.toUpperCase() ?? "MOT", name: clean(row.assetTypeName) ?? "Motor" };
};
const technicalFields = [
  { key: "powerKw", label: "Power", dataType: "NUMBER", unit: "kW" },
  { key: "hp", label: "HP", dataType: "NUMBER", unit: "HP" },
  { key: "frequencyHz", label: "Frequency", dataType: "NUMBER", unit: "Hz" },
  { key: "powerFactor", label: "Power Factor", dataType: "NUMBER", unit: null },
  { key: "voltageV", label: "Voltage", dataType: "NUMBER", unit: "V" },
  { key: "currentA", label: "Current", dataType: "NUMBER", unit: "A" },
  { key: "speedRpm", label: "Speed", dataType: "NUMBER", unit: "r/min" },
  { key: "bearingDe", label: "Bearing DE", dataType: "TEXT", unit: null },
  { key: "bearingNde", label: "Bearing NDE", dataType: "TEXT", unit: null },
  { key: "ipClass", label: "IP Class", dataType: "TEXT", unit: null },
  { key: "weightKg", label: "Weight", dataType: "NUMBER", unit: "kg" },
] as const;

async function main() {
  const source = JSON.parse(await readFile(inputPath, "utf8")) as { rows: SourceRow[] };
  const rows = source.rows;
  const missing = rows.flatMap((row) =>
    ["assetClass", "zone", "family", "name"].filter((key) => !clean(row[key as keyof SourceRow])).map((key) => `${row.sourceRow}:${key}`),
  );
  if (missing.length) throw new Error(`Missing required cells: ${missing.join(", ")}`);

  const plant = await db.plant.findFirst({ where: { code: { equals: "RTB" } } });
  if (!plant) throw new Error("Site RTB was not found.");
  const oldAssets = await db.asset.findMany({
    where: { plantId: plant.id },
    select: { id: true, code: true, imageStoragePath: true, documents: { select: { storagePath: true } } },
  });
  const summary = {
    site: `${plant.code} — ${plant.name}`,
    deleteAssets: oldAssets.length,
    importAssets: rows.length,
    classes: new Set(rows.map((row) => clean(row.assetClass))).size,
    zones: new Set(rows.map((row) => clean(row.zone))).size,
    families: new Set(rows.map((row) => clean(row.family))).size,
    types: [...new Map(rows.map((row) => [normalizedType(row).code, normalizedType(row).name])).entries()],
    technicalFieldsPerType: technicalFields.length,
  };
  console.log(JSON.stringify({ mode: commit ? "COMMIT" : "VALIDATE", ...summary }, null, 2));
  if (!commit) return;

  await db.$transaction(async (tx) => {
    await tx.asset.deleteMany({ where: { plantId: plant.id, parentId: { not: null } } });
    await tx.asset.deleteMany({ where: { plantId: plant.id } });
    await tx.assetSequence.deleteMany({ where: { plantId: plant.id } });
    await tx.assetType.deleteMany({ where: { plantId: plant.id } });
    await tx.assetFamily.deleteMany({ where: { plantId: plant.id } });
    await tx.assetClass.deleteMany({ where: { plantId: plant.id } });

    const zoneNames = [...new Set(rows.map((row) => clean(row.zone)!).filter(Boolean))];
    for (const name of zoneNames) {
      await tx.zone.upsert({
        where: { plantId_name: { plantId: plant.id, name } },
        update: { active: true },
        create: { plantId: plant.id, name, active: true },
      });
    }
    const zones = await tx.zone.findMany({ where: { plantId: plant.id, name: { in: zoneNames } } });
    const zoneIds = new Map(zones.map((zone) => [zone.name, zone.id]));

    const classNames = [...new Set(rows.map((row) => clean(row.assetClass)!).filter(Boolean))];
    const classIds = new Map(classNames.map((name) => [name, randomUUID()]));
    await tx.assetClass.createMany({ data: classNames.map((name) => ({ id: classIds.get(name)!, plantId: plant.id, nameTh: name, nameEn: name })) });

    const typeEntries = [...new Map(rows.map((row) => {
      const type = normalizedType(row);
      return [type.code, { ...type, className: clean(row.assetClass)! }];
    })).values()];
    const typeIds = new Map(typeEntries.map((type) => [type.code, randomUUID()]));
    await tx.assetType.createMany({ data: typeEntries.map((type) => ({
      id: typeIds.get(type.code)!, plantId: plant.id, assetClassId: classIds.get(type.className)!,
      code: type.code, nameTh: type.name, nameEn: type.name,
    })) });

    const fieldIds = new Map<string, string>();
    await tx.assetTechnicalField.createMany({ data: typeEntries.flatMap((type) => technicalFields.map((field, sortOrder) => {
      const id = randomUUID();
      fieldIds.set(`${type.code}:${field.key}`, id);
      return { id, assetTypeId: typeIds.get(type.code)!, key: field.key, labelTh: field.label, labelEn: field.label,
        dataType: field.dataType, unit: field.unit, required: false, active: true, sortOrder };
    })) });

    const familyNames = new Map<string, string>();
    for (const row of rows) {
      const code = clean(row.family)!.toUpperCase();
      if (!familyNames.has(code)) familyNames.set(code, clean(row.name)!);
    }
    const familyCodes = [...familyNames.keys()];
    const familyIds = new Map(familyCodes.map((code) => [code, randomUUID()]));
    await tx.assetFamily.createMany({ data: familyCodes.map((code) => ({
      id: familyIds.get(code)!, plantId: plant.id, code, nameTh: "", nameEn: familyNames.get(code)!,
    })) });

    const sequenceByFamily = new Map<string, number>();
    const assetRows = rows.map((row) => {
      const family = clean(row.family)!.toUpperCase();
      const sequence = (sequenceByFamily.get(family) ?? 0) + 1;
      sequenceByFamily.set(family, sequence);
      const type = normalizedType(row);
      const id = randomUUID();
      const serialNumber = clean(row.serialNumber);
      return {
        id, publicToken: randomUUID(), plantId: plant.id, familyId: familyIds.get(family)!,
        assetClassId: classIds.get(clean(row.assetClass)!)!, assetTypeId: typeIds.get(type.code)!,
        zoneId: zoneIds.get(clean(row.zone)!)!, code: `${plant.code.toUpperCase()}-${family}-${String(sequence).padStart(3, "0")}`,
        sequence, nameTh: clean(row.name)!, nameEn: clean(row.name), manufacturer: clean(row.manufacturer),
        model: clean(row.model), serialNumber, serialNormalized: serialNumber?.replace(/[^A-Z0-9]/gi, "").toUpperCase() || null,
        installationLocation: clean(row.zone), operatingStatus: "IN_SERVICE", criticality: "MEDIUM",
        sourceRow: row.sourceRow, typeCode: type.code, technical: row.technical,
      };
    });
    await tx.asset.createMany({ data: assetRows.map(({ sourceRow: _sourceRow, typeCode: _typeCode, technical: _technical, ...asset }) => asset) });
    await tx.assetSequence.createMany({ data: [...sequenceByFamily].map(([family, lastNumber]) => ({ plantId: plant.id, familyId: familyIds.get(family)!, lastNumber })) });

    const technicalValues = assetRows.flatMap((asset) => technicalFields.flatMap((field, sortOrder) => {
      const value = clean(asset.technical[field.key]);
      return value === null ? [] : [{ assetId: asset.id, fieldId: fieldIds.get(`${asset.typeCode}:${field.key}`)!, dataType: field.dataType, unit: field.unit, value, sortOrder }];
    }));
    await tx.assetTechnicalValue.createMany({ data: technicalValues });
  }, { timeout: 120_000 });

  const storageRoot = path.resolve("storage");
  const oldPaths = oldAssets.flatMap((asset) => [asset.imageStoragePath, ...asset.documents.map((document) => document.storagePath)]).filter(Boolean) as string[];
  let removedFiles = 0;
  for (const oldPath of oldPaths) {
    const absolute = path.resolve(oldPath);
    if (absolute.startsWith(`${storageRoot}${path.sep}`)) {
      await rm(absolute, { force: true });
      removedFiles += 1;
    }
  }
  console.log(JSON.stringify({ imported: rows.length, removedFiles }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
