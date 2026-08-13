import { readFile } from "node:fs/promises";
import { db } from "../lib/db";

type SourceAsset = Record<string, any>;

if (process.env.VERCEL_ENV !== "production") {
  console.log("[control-valve-sync] Skipped outside the Vercel production environment.");
  await db.$disconnect();
  process.exit(0);
}

const payload = JSON.parse(await readFile("prisma/data/control-valves.json", "utf8"));
const parents = payload.parents as SourceAsset[];
const children = payload.children as SourceAsset[];
const assets = [...parents, ...children];
const codes = assets.map((asset) => asset.code);
const sourcePlant = assets[0]?.plant;

if (!sourcePlant?.organizationSlug || !sourcePlant?.code) {
  throw new Error("Control Valve source is missing its organization or plant.");
}

const organization = await db.organization.findUnique({
  where: { slug: sourcePlant.organizationSlug },
});
if (!organization) throw new Error(`Organization ${sourcePlant.organizationSlug} was not found.`);

let plant = await db.plant.findFirst({
  where: { organizationId: organization.id, code: sourcePlant.code },
});
if (!plant) {
  const organizationPlants = await db.plant.findMany({
    where: { organizationId: organization.id, active: true },
    orderBy: { code: "asc" },
  });
  if (organizationPlants.length !== 1) {
    const available = organizationPlants.map((candidate) => candidate.code).join(", ") || "none";
    throw new Error(`Plant ${sourcePlant.code} was not found; active candidates: ${available}.`);
  }
  plant = organizationPlants[0];
  console.log(`[control-valve-sync] Local plant ${sourcePlant.code} mapped to the only active production plant ${plant.code}.`);
}

const beforeCount = await db.asset.count({ where: { code: { in: codes } } });
console.log(`[control-valve-sync] Production has ${beforeCount}/${codes.length} matching assets before sync.`);

await db.$transaction(async (tx) => {
  const classIds = new Map<string, string>();
  const familyIds = new Map<string, string>();
  const typeIds = new Map<string, string>();
  const fieldIds = new Map<string, string>();
  const zoneIds = new Map<string, string>();
  const sourceToProductionAssetIds = new Map<string, string>();

  for (const asset of assets) {
    const key = asset.assetClass.nameTh;
    if (classIds.has(key)) continue;
    const row = await tx.assetClass.upsert({
      where: { plantId_nameTh: { plantId: plant.id, nameTh: key } },
      create: {
        plantId: plant.id,
        nameTh: key,
        nameEn: asset.assetClass.nameEn,
        active: asset.assetClass.active,
      },
      update: {},
    });
    classIds.set(key, row.id);
  }

  for (const asset of assets) {
    const key = asset.family.code;
    if (familyIds.has(key)) continue;
    const row = await tx.assetFamily.upsert({
      where: { plantId_code: { plantId: plant.id, code: key } },
      create: {
        plantId: plant.id,
        code: key,
        nameTh: asset.family.nameTh,
        nameEn: asset.family.nameEn,
        active: asset.family.active,
      },
      update: {},
    });
    familyIds.set(key, row.id);
    await tx.assetSequence.upsert({
      where: { plantId_familyId: { plantId: plant.id, familyId: row.id } },
      create: { plantId: plant.id, familyId: row.id, lastNumber: asset.family.lastNumber },
      update: {},
    });
  }

  for (const asset of assets) {
    const key = asset.assetType.code;
    if (typeIds.has(key)) continue;
    const type = await tx.assetType.upsert({
      where: { plantId_code: { plantId: plant.id, code: key } },
      create: {
        plantId: plant.id,
        assetClassId: classIds.get(asset.assetClass.nameTh)!,
        code: key,
        nameTh: asset.assetType.nameTh,
        nameEn: asset.assetType.nameEn,
        active: asset.assetType.active,
      },
      update: {},
    });
    typeIds.set(key, type.id);

    for (const field of asset.assetType.fields) {
      const row = await tx.assetTechnicalField.upsert({
        where: { assetTypeId_key: { assetTypeId: type.id, key: field.key } },
        create: {
          assetTypeId: type.id,
          key: field.key,
          labelTh: field.labelTh,
          labelEn: field.labelEn,
          dataType: field.dataType,
          unit: field.unit,
          optionsJson: field.optionsJson,
          required: field.required,
          active: field.active,
          sortOrder: field.sortOrder,
        },
        update: {},
      });
      fieldIds.set(`${key}:${field.key}`, row.id);
    }
  }

  for (const asset of assets) {
    if (!asset.zone?.name || zoneIds.has(asset.zone.name)) continue;
    const row = await tx.zone.upsert({
      where: { plantId_name: { plantId: plant.id, name: asset.zone.name } },
      create: { plantId: plant.id, name: asset.zone.name, active: asset.zone.active },
      update: {},
    });
    zoneIds.set(asset.zone.name, row.id);
  }

  const syncAsset = async (asset: SourceAsset, parentId: string | null) => {
    const existing = await tx.asset.findUnique({ where: { code: asset.code } });
    const row = existing ?? await tx.asset.create({
      data: {
        plantId: plant.id,
        familyId: familyIds.get(asset.family.code)!,
        assetClassId: classIds.get(asset.assetClass.nameTh)!,
        assetTypeId: typeIds.get(asset.assetType.code)!,
        zoneId: asset.zone?.name ? zoneIds.get(asset.zone.name) : null,
        parentId,
        code: asset.code,
        sequence: asset.sequence,
        componentCode: asset.componentCode,
        nameTh: asset.nameTh,
        nameEn: asset.nameEn,
        installationLocation: asset.installationLocation,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serialNumber: asset.serialNumber,
        serialNormalized: asset.serialNormalized,
        installedAt: asset.installedAt ? new Date(asset.installedAt) : null,
        commissionedAt: asset.commissionedAt ? new Date(asset.commissionedAt) : null,
        operatingStatus: asset.operatingStatus,
        criticality: asset.criticality,
        registrationStatus: asset.registrationStatus,
        cancellationReason: asset.cancellationReason,
        imageFileName: asset.imageFileName,
        imageMimeType: asset.imageMimeType,
        imageFileSize: asset.imageFileSize,
        imageStoragePath: asset.imageStoragePath,
        qrOverrideJson: asset.qrOverrideJson,
      },
    });
    sourceToProductionAssetIds.set(asset.sourceId, row.id);

    for (const value of asset.technicalValues) {
      const fieldId = fieldIds.get(`${asset.assetType.code}:${value.fieldKey}`);
      if (!fieldId) throw new Error(`Field ${value.fieldKey} is missing for ${asset.code}.`);
      await tx.assetTechnicalValue.upsert({
        where: { assetId_fieldId: { assetId: row.id, fieldId } },
        create: {
          assetId: row.id,
          fieldId,
          customLabel: value.customLabel,
          dataType: value.dataType,
          unit: value.unit,
          value: value.value,
          sortOrder: value.sortOrder,
        },
        update: {},
      });
    }
  };

  for (const parent of parents) await syncAsset(parent, null);
  for (const child of children) {
    const parentId = sourceToProductionAssetIds.get(child.sourceParentId);
    if (!parentId) throw new Error(`Parent mapping is missing for ${child.code}.`);
    await syncAsset(child, parentId);
  }
}, { maxWait: 30_000, timeout: 120_000 });

const after = await db.asset.findMany({
  where: { code: { in: codes } },
  select: {
    parentId: true,
    assetType: { select: { code: true } },
    technicalValues: { select: { id: true } },
  },
});

const parentsAfter = after.filter((asset) => !asset.parentId).length;
const componentsAfter = after.filter((asset) => asset.assetType?.code === "CV").length;
const valuesAfter = after.reduce((sum, asset) => sum + asset.technicalValues.length, 0);
console.log(`[control-valve-sync] Complete: ${after.length} assets (${parentsAfter} parents, ${componentsAfter} CV components), ${valuesAfter} technical values.`);

if (after.length !== codes.length || parentsAfter !== parents.length || componentsAfter !== children.length) {
  throw new Error("Control Valve production verification failed.");
}

await db.$disconnect();
