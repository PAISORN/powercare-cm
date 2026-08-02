import { db } from "../../lib/db";

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

export function normalizeAssetSegment(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized || normalized.length > 8) throw new Error("รหัสต้องเป็น A-Z หรือ 0-9 และยาวไม่เกิน 8 ตัว");
  return normalized;
}

export function formatAssetSequence(sequence: number) {
  return String(sequence).padStart(3, "0");
}

export async function createRegisteredAsset(input: {
  plantId: string;
  familyId: string;
  assetClassId: string;
  assetTypeId?: string | null;
  zoneId?: string | null;
  parentId?: string | null;
  componentCode?: string | null;
  nameTh: string;
  nameEn?: string | null;
  installationLocation?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  installedAt?: Date | null;
  commissionedAt?: Date | null;
  operatingStatus: string;
  criticality: string;
}) {
  return db.$transaction(async (tx) => {
    const [plant, family, assetClass, assetType] = await Promise.all([
      tx.plant.findUniqueOrThrow({ where: { id: input.plantId }, select: { id: true, code: true } }),
      tx.assetFamily.findFirstOrThrow({ where: { id: input.familyId, plantId: input.plantId, active: true } }),
      tx.assetClass.findFirstOrThrow({ where: { id: input.assetClassId, plantId: input.plantId, active: true } }),
      input.assetTypeId
        ? tx.assetType.findFirstOrThrow({ where: { id: input.assetTypeId, plantId: input.plantId, active: true } })
        : Promise.resolve(null),
    ]);

    let sequence: number;
    let parentId: string | null = null;
    let componentCode: string | null = null;
    if (input.parentId) {
      const parent = await tx.asset.findFirstOrThrow({
        where: { id: input.parentId, plantId: input.plantId, parentId: null, registrationStatus: "ACTIVE" },
      });
      if (!parent.sequence || parent.familyId !== family.id) {
        throw new Error("Asset ลูกต้องอยู่ใน Asset Family เดียวกับ Asset แม่");
      }
      if (!assetType) throw new Error("Asset ลูกต้องระบุ Asset Type");
      sequence = parent.sequence;
      parentId = parent.id;
      componentCode = normalizeAssetSegment(input.componentCode || assetType.code);
    } else {
      const current = await tx.assetSequence.upsert({
        where: { plantId_familyId: { plantId: plant.id, familyId: family.id } },
        create: { plantId: plant.id, familyId: family.id, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });
      sequence = current.lastNumber;
    }

    const prefix = [normalizeAssetSegment(plant.code), family.code, componentCode]
      .filter(Boolean)
      .map((part) => normalizeAssetSegment(String(part)))
      .join("-");
    const code = `${prefix}-${formatAssetSequence(sequence)}`;
    const serialNumber = input.serialNumber?.trim() || null;

    return tx.asset.create({
      data: {
        plantId: plant.id,
        familyId: family.id,
        assetClassId: assetClass.id,
        assetTypeId: assetType?.id ?? null,
        zoneId: input.zoneId || null,
        parentId,
        componentCode,
        sequence,
        code,
        nameTh: input.nameTh.trim(),
        nameEn: input.nameEn?.trim() || null,
        installationLocation: input.installationLocation?.trim() || null,
        manufacturer: input.manufacturer?.trim() || null,
        model: input.model?.trim() || null,
        serialNumber,
        serialNormalized: serialNumber?.replace(/\s+/g, "").toUpperCase() || null,
        installedAt: input.installedAt,
        commissionedAt: input.commissionedAt,
        operatingStatus: input.operatingStatus,
        criticality: input.criticality,
      },
    });
  });
}

export function assetStatusLabel(status: string) {
  return ({ IN_SERVICE: "ใช้งาน", UNDER_REPAIR: "ปิดซ่อม", STANDBY: "สำรอง", TEMPORARILY_OUT: "หยุดใช้งานชั่วคราว", RETIRED: "ปลดระวาง" } as Record<string, string>)[status] ?? status;
}

export function criticalityLabel(value: string) {
  return ({ CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as Record<string, string>)[value] ?? value;
}
