import { db } from "../../lib/db";
import { canManagePlantProfile } from "../auth/permission";
import { isSiteAdminRole, type Actor } from "../cm-work/cm-work-types";
import { DEFAULT_PLANT_ID, defaultPlantRecord } from "./organization-foundation";

export type PlantProfileInput = {
  companyName: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  logoFileName: string | null;
  logoMimeType: string | null;
  logoFileSize: number | null;
  logoStoragePath: string | null;
};

export type PlantDashboardProfile = PlantProfileInput & {
  id: string;
  plantId: string;
  displayName: string;
  plantName: string;
  plantCode: string;
  hasLogo: boolean;
};

export async function readPlantProfile(plantId?: string | null): Promise<PlantDashboardProfile> {
  const targetPlantId = normalizePlantId(plantId);
  const plant = await db.plant.findUnique({
    where: { id: targetPlantId },
    include: { profile: true },
  });
  const profile = plant?.profile;
  const plantName = plant?.name ?? defaultPlantRecord.name;
  const plantCode = plant?.code ?? defaultPlantRecord.code;
  const companyName = profile?.companyName?.trim() || plantName;

  return {
    id: profile?.id ?? profileIdForPlant(targetPlantId),
    plantId: targetPlantId,
    displayName: companyName,
    plantName,
    plantCode,
    companyName,
    address: profile?.address ?? null,
    contactName: profile?.contactName ?? null,
    contactPhone: profile?.contactPhone ?? null,
    notes: profile?.notes ?? null,
    logoFileName: profile?.logoFileName ?? null,
    logoMimeType: profile?.logoMimeType ?? null,
    logoFileSize: profile?.logoFileSize ?? null,
    logoStoragePath: profile?.logoStoragePath ?? null,
    hasLogo: Boolean(profile?.logoStoragePath),
  };
}

export async function updatePlantProfile(
  actor: Actor,
  input: PlantProfileInput,
  plantId?: string | null,
) {
  if (!canManagePlantProfile(actor)) throw new Error("Only permitted users can update Site Profile");
  const targetPlantId = normalizePlantId(plantId || actor.plantId);
  if (isSiteAdminRole(actor.role) && normalizePlantId(actor.plantId) !== targetPlantId) {
    throw new Error("Site Admin can update only own Site Profile");
  }
  const plant = await db.plant.findUnique({
    where: { id: targetPlantId },
    select: { id: true, organizationId: true, name: true },
  });
  if (!plant) throw new Error("Site not found");

  const normalized = normalizePlantProfileInput(input);
  return db.$transaction(async (tx) => {
    const previous = await tx.plantProfile.findUnique({ where: { plantId: targetPlantId } });
    const updated = await tx.plantProfile.upsert({
      where: { plantId: targetPlantId },
      update: normalized,
      create: {
        id: profileIdForPlant(targetPlantId),
        plantId: targetPlantId,
        ...normalized,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: actor.id,
        organizationId: plant.organizationId,
        plantId: targetPlantId,
        entityType: "PlantProfile",
        entityId: updated.id,
        action: "UPDATE_PLANT_PROFILE",
        beforeJson: JSON.stringify({
          companyName: previous?.companyName ?? plant.name,
          hasLogo: Boolean(previous?.logoStoragePath),
        }),
        afterJson: JSON.stringify({
          companyName: updated.companyName ?? plant.name,
          hasLogo: Boolean(updated.logoStoragePath),
        }),
      },
    });
    return updated;
  });
}

function normalizePlantProfileInput(input: PlantProfileInput): PlantProfileInput {
  return {
    companyName: normalizeOptionalText(input.companyName, 200),
    address: normalizeOptionalText(input.address, 500),
    contactName: normalizeOptionalText(input.contactName, 160),
    contactPhone: normalizeOptionalText(input.contactPhone, 80),
    notes: normalizeOptionalText(input.notes, 1000),
    logoFileName: input.logoFileName,
    logoMimeType: input.logoMimeType,
    logoFileSize: input.logoFileSize,
    logoStoragePath: input.logoStoragePath,
  };
}

function normalizeOptionalText(value: string | null, maxLength: number) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error("Site Profile text is too long");
  return normalized;
}

function normalizePlantId(value?: string | null) {
  return value?.trim() || DEFAULT_PLANT_ID;
}

function profileIdForPlant(plantId: string) {
  return `plant:${plantId}`;
}
