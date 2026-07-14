import { db } from "../../lib/db";
import { canManageCompanyOrganization } from "../auth/permission";
import type { Actor } from "../cm-work/cm-work-types";
import { DEFAULT_ORGANIZATION_ID } from "./organization-foundation";
import {
  ORGANIZATION_PROFILE_ID,
  normalizeOrganizationInput,
  organizationFallback,
} from "./organization-profile";

export type OrganizationProfileInput = {
  companyName: string;
  logoFileName: string | null;
  logoMimeType: string | null;
  logoFileSize: number | null;
  logoStoragePath: string | null;
};

export type OrganizationProfileStore = {
  read(organizationId?: string | null): Promise<(OrganizationProfileInput & { id: string; organizationId?: string | null }) | null>;
  readOrganizationName?(organizationId: string): Promise<string | null>;
  update(input: OrganizationProfileInput, actorId: string, organizationId?: string | null): Promise<unknown>;
};

const prismaStore: OrganizationProfileStore = {
  read: async (organizationId) => {
    const targetOrganizationId = normalizeProfileOrganizationId(organizationId);
    const scopedProfile = await db.organizationProfile.findUnique({ where: { organizationId: targetOrganizationId } });
    if (scopedProfile) return scopedProfile;
    if (targetOrganizationId !== DEFAULT_ORGANIZATION_ID) return null;
    return db.organizationProfile.findUnique({ where: { id: ORGANIZATION_PROFILE_ID } });
  },
  readOrganizationName: async (organizationId) =>
    (await db.organization.findUnique({ where: { id: organizationId }, select: { name: true } }))?.name ?? null,
  update: (input, actorId, organizationId) =>
    db.$transaction(async (tx) => {
      const targetOrganizationId = normalizeProfileOrganizationId(organizationId);
      const previous =
        (await tx.organizationProfile.findUnique({ where: { organizationId: targetOrganizationId } })) ??
        (targetOrganizationId === DEFAULT_ORGANIZATION_ID
          ? await tx.organizationProfile.findUnique({ where: { id: ORGANIZATION_PROFILE_ID } })
          : null);
      const updated = await tx.organizationProfile.upsert({
        where: { organizationId: targetOrganizationId },
        update: input,
        create: { id: profileIdForOrganization(targetOrganizationId), organizationId: targetOrganizationId, ...input },
      });
      await tx.auditEvent.create({
        data: {
          actorId,
          organizationId: targetOrganizationId,
          entityType: "OrganizationProfile",
          entityId: updated.id,
          action: "UPDATE_ORGANIZATION_PROFILE",
          beforeJson: JSON.stringify({
            companyName: previous?.companyName ?? organizationFallback.companyName,
            hasLogo: Boolean(previous?.logoStoragePath),
          }),
          afterJson: JSON.stringify({
            companyName: updated.companyName,
            hasLogo: Boolean(updated.logoStoragePath),
          }),
        },
      });
      return updated;
    }),
};

export async function readOrganizationProfile(
  organizationId?: string | null,
  store: OrganizationProfileStore = prismaStore,
) {
  const targetOrganizationId = normalizeProfileOrganizationId(organizationId);
  const profile = await store.read(targetOrganizationId);
  if (profile) return { ...profile, hasLogo: Boolean(profile.logoStoragePath) };
  const organizationName = await store.readOrganizationName?.(targetOrganizationId);
  return {
    ...organizationFallback,
    id: profileIdForOrganization(targetOrganizationId),
    organizationId: targetOrganizationId,
    companyName: organizationName ?? organizationFallback.companyName,
  };
}

export async function updateOrganizationProfile(
  actor: Actor,
  input: OrganizationProfileInput,
  store: OrganizationProfileStore = prismaStore,
) {
  if (!canManageCompanyOrganization(actor)) throw new Error("Only admin can update the organization profile");
  const normalized = normalizeOrganizationInput(input);
  return store.update({ ...input, ...normalized }, actor.id, actor.organizationId);
}

function normalizeProfileOrganizationId(organizationId?: string | null) {
  return organizationId?.trim() || DEFAULT_ORGANIZATION_ID;
}

function profileIdForOrganization(organizationId: string) {
  return organizationId === DEFAULT_ORGANIZATION_ID ? ORGANIZATION_PROFILE_ID : `organization:${organizationId}`;
}
