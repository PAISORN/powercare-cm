import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { isInstrumentType, isSystemAssetType, isValidAssetSystemName, validateAssetHierarchy, type AssetHierarchyNode } from "./asset-hierarchy";

export const AssetOperatingStatus = {
  IN_SERVICE: "IN_SERVICE",
  UNDER_REPAIR: "UNDER_REPAIR",
  STANDBY: "STANDBY",
  TEMPORARILY_OUT: "TEMPORARILY_OUT",
  RETIRED: "RETIRED",
} as const;

export const AssetCriticality = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export const STANDARD_ASSET_CODE = /^MC-[A-Z]{3}-\d{3}$/;
export const LEGACY_ASSET_CODE_EXCEPTIONS = new Set(["MC-ARC-5001", "MC-ARC-5002", "MC-ARC-5003", "MC-ARC-5004", "MC-ARC-5005", "MC-ARC-5006", "MC-ARC-5007"]);

export function isAllowedAssetCode(value: string) {
  const code = value.trim().toUpperCase();
  return STANDARD_ASSET_CODE.test(code) || LEGACY_ASSET_CODE_EXCEPTIONS.has(code);
}

export function normalizeAssetTypeCode(value: string) {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error("Asset Type Code ต้องเป็นตัวอักษร A-Z จำนวน 3 ตัว");
  return code;
}
export function normalizeAssetSegment(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized || normalized.length > 8) throw new Error("รหัสต้องเป็น A-Z หรือ 0-9 และยาวไม่เกิน 8 ตัว");
  return normalized;
}

export function formatAssetSequence(sequence: number) {
  return String(sequence).padStart(3, "0");
}

export function assetStatusLabel(status: string) {
  return ({ IN_SERVICE: "ใช้งาน", UNDER_REPAIR: "ปิดซ่อม", STANDBY: "สำรอง", TEMPORARILY_OUT: "หยุดใช้งานชั่วคราว", RETIRED: "ปลดระวาง" } as Record<string, string>)[status] ?? status;
}

export function criticalityLabel(value: string) {
  return ({ CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as Record<string, string>)[value] ?? value;
}



export type RegisteredAssetInput = {
  plantId: string; code?: string | null; systemId?: string | null; assetTypeId?: string | null;
  assetLevel?: string; familyId?: string | null; assetClassId?: string | null;
  zoneId?: string | null; parentId?: string | null; componentCode?: string | null;
  nameTh: string; nameEn?: string | null; discipline?: string | null; tagKks?: string | null;
  registrationCode?: string | null; keySpecification?: string | null; metadataJson?: string | null;
  installationLocation?: string | null; manufacturer?: string | null; model?: string | null;
  serialNumber?: string | null; installedAt?: Date | null; commissionedAt?: Date | null;
  operatingStatus: string; criticality: string;
};
const clean = (s?: string | null) => s?.trim() || null;
export async function validateRegisteredAsset(tx: Prisma.TransactionClient, input: RegisteredAssetInput, id: string, graph?: readonly AssetHierarchyNode[]) {
  if (!input.nameTh.trim()) throw new Error("กรุณาระบุชื่อ Asset");
  if (!clean(input.code)) throw new Error("กรุณาระบุ Asset Code");
  if (!isAllowedAssetCode(input.code!)) throw new Error("Asset Code ต้องเป็น MC-XXX-001 หรือ exception ที่อนุมัติไว้");
  if (!input.systemId || !input.assetTypeId) throw new Error("กรุณาระบุ System และ Asset Type");
  if (!Object.values(AssetOperatingStatus).includes(input.operatingStatus as never) || !Object.values(AssetCriticality).includes(input.criticality as never)) throw new Error("สถานะหรือ Criticality ไม่ถูกต้อง");
  const [system, type, zone, family, assetClass, duplicate, assets] = await Promise.all([
    tx.assetSystem.findFirst({ where: { id: input.systemId, plantId: input.plantId, active: true } }),
    tx.assetType.findFirst({ where: { id: input.assetTypeId, plantId: input.plantId, active: true } }),
    input.zoneId ? tx.zone.findFirst({ where: { id: input.zoneId, plantId: input.plantId, active: true } }) : null,
    input.familyId ? tx.assetFamily.findFirst({ where: { id: input.familyId, plantId: input.plantId, active: true } }) : null,
    input.assetClassId ? tx.assetClass.findFirst({ where: { id: input.assetClassId, plantId: input.plantId, active: true } }) : null,
    tx.asset.findFirst({ where: { code: input.code!.trim(), id: { not: id } }, select: { id: true } }),
    tx.asset.findMany({ where: { plantId: input.plantId }, include: { assetType: true } }),
  ]);
  if (!system || !type || (input.zoneId && !zone) || (input.familyId && !family) || (input.assetClassId && !assetClass)) throw new Error("Master Data ไม่ถูกต้องหรืออยู่คนละ Site");
  const selectedParent = input.parentId ? assets.find(asset => asset.id === input.parentId) : null;
  const stagedParent = input.parentId && graph ? graph.find(asset => asset.id === input.parentId) : null;
  if (input.parentId && ((!selectedParent && !stagedParent) || (selectedParent && (selectedParent.registrationStatus !== "ACTIVE" || selectedParent.migrationStatus !== "READY")))) {
    throw new Error("Parent Asset ต้องอยู่ใน Site เดียวกัน มีสถานะ ACTIVE และผ่านการตรวจสอบ migration แล้ว");
  }
  if (!isValidAssetSystemName(system.nameTh) || (system.nameEn && !isValidAssetSystemName(system.nameEn))) throw new Error("Instrument ไม่สามารถเป็น System ได้");
  if (isSystemAssetType(type.nameTh) || (type.nameEn && isSystemAssetType(type.nameEn))) throw new Error("ชื่อ System ไม่สามารถใช้เป็น Asset Type ได้");
  if (type.discipline) input.discipline = type.discipline;
  if (isInstrumentType(type.nameTh) || isInstrumentType(type.nameEn || "")) input.discipline = "Instrument";
  if (duplicate) throw new Error("Asset Code ซ้ำ");
  if (input.metadataJson) { try { JSON.parse(input.metadataJson); } catch { throw new Error("Metadata JSON ไม่ถูกต้อง"); } }
  const candidate = { ...input, id, systemId: input.systemId, parentId: input.parentId || null, assetLevel: input.assetLevel || "", assetTypeName: type.nameEn || type.nameTh };
  const issues = validateAssetHierarchy(candidate, graph || assets.map(a => ({ ...a, assetTypeName: a.assetType?.nameEn || a.assetType?.nameTh })));
  if (issues.length) throw new Error(`โครงสร้าง Asset ไม่ถูกต้อง: ${issues.join(", ")}`);
}
export function registeredAssetData(input: RegisteredAssetInput) {
  const serialNumber = clean(input.serialNumber);
  return {
    plantId: input.plantId, code: clean(input.code), systemId: clean(input.systemId), assetTypeId: clean(input.assetTypeId),
    assetLevel: input.assetLevel!, familyId: clean(input.familyId), assetClassId: clean(input.assetClassId),
    zoneId: clean(input.zoneId), parentId: clean(input.parentId), nameTh: input.nameTh.trim(), nameEn: clean(input.nameEn),
    discipline: clean(input.discipline), tagKks: clean(input.tagKks), registrationCode: clean(input.registrationCode),
    keySpecification: clean(input.keySpecification), metadataJson: clean(input.metadataJson),
    installationLocation: clean(input.installationLocation), manufacturer: clean(input.manufacturer), model: clean(input.model),
    serialNumber, serialNormalized: serialNumber?.replace(/\s+/g, "").toUpperCase() || null,
    installedAt: input.installedAt, commissionedAt: input.commissionedAt,
    operatingStatus: input.operatingStatus, criticality: input.criticality, migrationStatus: "READY",
  };
}
async function reserveNextAssetCode(tx: Prisma.TransactionClient, plantId: string, assetTypeId: string) {
  const type = await tx.assetType.findFirstOrThrow({ where: { id: assetTypeId, plantId, active: true }, select: { code: true } });
  const typeCode = normalizeAssetTypeCode(type.code);
  const sequence = await tx.assetCodeSequence.upsert({
    where: { plantId_typeCode: { plantId, typeCode } },
    create: { plantId, typeCode, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });
  if (sequence.lastNumber > 999) throw new Error(`Asset Code ${typeCode} เกินลำดับ 999`);
  return `MC-${typeCode}-${String(sequence.lastNumber).padStart(3, "0")}`;
}

export async function createRegisteredAsset(input: RegisteredAssetInput) {
  return db.$transaction(async tx => {
    if (!input.assetTypeId) throw new Error("กรุณาระบุ Asset Type");
    const prepared = { ...input, code: clean(input.code)?.toUpperCase() || await reserveNextAssetCode(tx, input.plantId, input.assetTypeId) };
    await validateRegisteredAsset(tx, prepared, "__new_asset__");
    return tx.asset.create({ data: registeredAssetData(prepared) });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
export async function updateRegisteredAsset(id: string, input: RegisteredAssetInput) {
  return db.$transaction(async tx => {
    await tx.asset.findFirstOrThrow({ where: { id, plantId: input.plantId, registrationStatus: "ACTIVE" } });
    await validateRegisteredAsset(tx, input, id);
    return tx.asset.update({ where: { id }, data: registeredAssetData(input) });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
