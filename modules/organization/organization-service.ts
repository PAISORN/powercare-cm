import { db } from "../../lib/db";
import { canManageOrganization } from "../auth/permission";
import type { Actor } from "../cm-work/cm-work-types";
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
  read(): Promise<(OrganizationProfileInput & { id: string }) | null>;
  update(input: OrganizationProfileInput, actorId: string): Promise<unknown>;
};

const prismaStore: OrganizationProfileStore = {
  read: () => db.organizationProfile.findUnique({ where: { id: ORGANIZATION_PROFILE_ID } }),
  update: (input, actorId) =>
    db.$transaction(async (tx) => {
      const previous = await tx.organizationProfile.findUnique({ where: { id: ORGANIZATION_PROFILE_ID } });
      const updated = await tx.organizationProfile.upsert({
        where: { id: ORGANIZATION_PROFILE_ID },
        update: input,
        create: { id: ORGANIZATION_PROFILE_ID, ...input },
      });
      await tx.auditEvent.create({
        data: {
          actorId,
          entityType: "OrganizationProfile",
          entityId: ORGANIZATION_PROFILE_ID,
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

export async function readOrganizationProfile(store: OrganizationProfileStore = prismaStore) {
  const profile = await store.read();
  return profile ? { ...profile, hasLogo: Boolean(profile.logoStoragePath) } : organizationFallback;
}

export async function updateOrganizationProfile(
  actor: Actor,
  input: OrganizationProfileInput,
  store: OrganizationProfileStore = prismaStore,
) {
  if (!canManageOrganization(actor.role)) throw new Error("Only admin can update the organization profile");
  const normalized = normalizeOrganizationInput(input);
  return store.update({ ...input, ...normalized }, actor.id);
}
