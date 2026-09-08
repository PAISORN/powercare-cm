import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { registeredAssetData, validateRegisteredAsset, type RegisteredAssetInput } from "./asset-service";
import { validateAssetHierarchy } from "./asset-hierarchy";

export type AssetImportRow = Record<string, string | number | boolean | null>;
const cell = (row: AssetImportRow, key: string) => String(row[key] ?? "").trim();
export async function prepareAssetImport(tx: Prisma.TransactionClient, plantId: string, rows: AssetImportRow[]) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 1000 || rows.some(r => !r || typeof r !== "object" || Array.isArray(r))) throw new Error("จำนวนแถวต้องเป็น 1–1000");
  const [systems, types, zones, families, classes, existing] = await Promise.all([
    tx.assetSystem.findMany({ where: { plantId, active: true } }), tx.assetType.findMany({ where: { plantId, active: true } }),
    tx.zone.findMany({ where: { plantId, active: true } }), tx.assetFamily.findMany({ where: { plantId, active: true } }),
    tx.assetClass.findMany({ where: { plantId, active: true } }), tx.asset.findMany({ where: { plantId }, include: { assetType: true } }),
  ]);
  const ids = rows.map(() => randomUUID());
  const codes = rows.map(row => cell(row, "Asset Code"));
  if (codes.some(code => !code) || new Set(codes).size !== codes.length) throw new Error("Asset Code ต้องไม่ว่างและไม่ซ้ำกันในไฟล์");
  const match = <T extends { code: string; nameTh?: string; nameEn?: string | null }>(items: T[], value: string) => items.filter(x => [x.code, x.nameTh, x.nameEn].some(s => s && s.toLowerCase() === value.toLowerCase()));
  const resolve = <T extends { code: string; nameTh?: string; nameEn?: string | null }>(items: T[], value: string, label: string, optional = false) => { if (!value && optional) return null; const found = match(items,value); if (found.length !== 1) throw new Error(`ไม่พบ ${label} หรือชื่อซ้ำ: ${value}`); return found[0]; };
  const prepared = rows.map((row, index) => {
    const parentCode = cell(row,"Parent Code");
    const parentIndex = codes.indexOf(parentCode);
    const parent = parentCode ? (parentIndex >= 0 ? ids[parentIndex] : existing.find(a => a.code === parentCode && a.registrationStatus === "ACTIVE")?.id) : null;
    if (parentCode && !parent) throw new Error(`แถว ${index + 2}: ไม่พบ Parent Code ${parentCode}`);
    const zoneValue = cell(row,"Area / Zone") || cell(row,"Zone");
    const zoneMatches = zones.filter(z => z.name.toLowerCase() === zoneValue.toLowerCase());
    if (zoneValue && zoneMatches.length !== 1) throw new Error(`แถว ${index + 2}: ไม่พบ Area / Zone หรือชื่อซ้ำ`);
    const type = resolve(types, cell(row,"Asset Type"), "Asset Type")!;
    const input: RegisteredAssetInput = {
      plantId, code: codes[index], nameTh: cell(row,"Asset Name") || cell(row,"ชื่อภาษาไทย") || cell(row,"English Name"), nameEn: cell(row,"English Name"),
      systemId: resolve(systems,cell(row,"System"),"System")!.id, assetTypeId: type.id, assetLevel: cell(row,"Asset Level"),
      parentId: parent, zoneId: zoneMatches[0]?.id || null,
      familyId: resolve(families,cell(row,"Family Code"),"Family Code",true)?.id,
      assetClassId: resolve(classes.map(c => ({...c, code:c.nameTh})),cell(row,"Asset Class"),"Asset Class",true)?.id,
      discipline: cell(row,"Discipline"), tagKks: cell(row,"Tag / KKS"), registrationCode: cell(row,"Registration Code"),
      keySpecification: cell(row,"Key Specification"), metadataJson: cell(row,"Metadata JSON"),
      manufacturer: cell(row,"Manufacturer"), model: cell(row,"Model"), serialNumber: cell(row,"Serial Number"),
      installationLocation: cell(row,"Installation Location"), operatingStatus: cell(row,"Operating Status") || "IN_SERVICE", criticality: cell(row,"Criticality") || "MEDIUM",
    };
    return { id:ids[index], input, assetTypeName: type.nameEn || type.nameTh };
  });
  const graph = [...existing.map(a => ({...a,assetTypeName:a.assetType?.nameEn || a.assetType?.nameTh})), ...prepared.map(p => ({...p.input,id:p.id,systemId:p.input.systemId!,parentId:p.input.parentId || null,assetLevel:p.input.assetLevel!,assetTypeName:p.assetTypeName}))];
  for (const [index,p] of prepared.entries()) {
    await validateRegisteredAsset(tx,p.input,p.id,graph);
    const issues = validateAssetHierarchy({...p.input,id:p.id,systemId:p.input.systemId!,parentId:p.input.parentId || null,assetLevel:p.input.assetLevel!,assetTypeName:p.assetTypeName},graph);
    if (issues.length) throw new Error(`แถว ${index+2}: ${issues.join(", ")}`);
  }
  return prepared;
}
export async function importRegisteredAssets(plantId: string, rows: AssetImportRow[], preview = false) {
  return db.$transaction(async tx => {
    const prepared = await prepareAssetImport(tx,plantId,rows);
    if (preview) return prepared.length;
    const pending = [...prepared]; const created = new Set<string>(); const ids = new Set<string>(prepared.map(p=>p.id));
    while (pending.length) {
      const index = pending.findIndex(p => !p.input.parentId || !ids.has(p.input.parentId) || created.has(p.input.parentId));
      if (index < 0) throw new Error("Circular parent");
      const p = pending.splice(index,1)[0];
      await tx.asset.create({data:{id:p.id,...registeredAssetData(p.input)}}); created.add(p.id);
    }
    return prepared.length;
  }, { timeout: 120000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
