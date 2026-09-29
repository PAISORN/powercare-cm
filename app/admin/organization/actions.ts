"use server";

import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { deleteStoredFile, saveOrganizationLogoFile, savePlantLogoFile } from "../../../lib/file-storage";
import { cacheTags, revalidateCmData } from "../../../lib/query-cache";
import { hashPassword } from "../../../lib/password";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import {
  createManagedUser,
  getManagedUserMutationIssue,
  updateManagedUser,
  type ManagedUserMutationIssue,
} from "../../../modules/users/managed-user-mutation";
import {
  parseCreateManagedUserInput,
  parseUpdateManagedUserInput,
} from "../../../modules/users/managed-user-mutation-input";
import {
  canManageCompanyOrganization,
  canManageOrganization,
  canManagePlantProfile,
} from "../../../modules/auth/permission";
import { RoleName, type Actor } from "../../../modules/cm-work/cm-work-types";
import { DEFAULT_ORGANIZATION_ID, normalizeOrganizationRecordInput } from "../../../modules/organization/organization-foundation";
import { readOrganizationProfile, updateOrganizationProfile } from "../../../modules/organization/organization-service";
import {
  readOrganizationScope,
  updateOrganizationScope,
  updatePlantScope,
} from "../../../modules/organization/organization-scope-service";
import { readPlantProfile, updatePlantProfile } from "../../../modules/organization/plant-profile-service";
export async function updateOrganizationAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageOrganization(user) && !canManagePlantProfile(user)) redirect("/dashboardcm");
  const actor = actorFrom(user);
  const canEditCompany = canManageCompanyOrganization(user);
  const canEditPlant = canManagePlantProfile(user);
  const profileOrganizationId = user.organizationId || DEFAULT_ORGANIZATION_ID;

  const existing = await readOrganizationProfile(profileOrganizationId);
  const existingPlantProfile = await readPlantProfile(user.plantId);
  const file = formData.get("logo");
  const plantLogo = formData.get("plantLogo");
  let uploaded: Awaited<ReturnType<typeof saveOrganizationLogoFile>> | null = null;
  let uploadedPlantLogo: Awaited<ReturnType<typeof savePlantLogoFile>> | null = null;

  try {
    if (canEditCompany) {
      await updateOrganizationScope(
        actor,
        {
          organizationName: String(formData.get("organizationName") ?? ""),
          organizationSlug: String(formData.get("organizationSlug") ?? ""),
          plantName: String(formData.get("plantName") ?? ""),
          plantCode: String(formData.get("plantCode") ?? ""),
        },
      );
      if (file instanceof File && file.size > 0) {
        uploaded = await saveOrganizationLogoFile(profileOrganizationId, file);
      }
      await updateOrganizationProfile(
        actor,
        {
          companyName: String(formData.get("companyName") ?? ""),
          logoFileName: uploaded?.fileName ?? existing.logoFileName,
          logoMimeType: uploaded?.mimeType ?? existing.logoMimeType,
          logoFileSize: uploaded?.fileSize ?? existing.logoFileSize,
          logoStoragePath: uploaded?.storagePath ?? existing.logoStoragePath,
        },
      );
    } else if (canEditPlant) {
      await updatePlantScope(actor, {
        plantName: String(formData.get("plantName") ?? ""),
        plantCode: String(formData.get("plantCode") ?? ""),
      });
      if (plantLogo instanceof File && plantLogo.size > 0) {
        uploadedPlantLogo = await savePlantLogoFile(user.plantId || "primary-plant", plantLogo);
      }
      await updatePlantProfile(
        actor,
        {
          companyName: String(formData.get("siteCompanyName") || formData.get("plantName") || ""),
          address: String(formData.get("siteAddress") ?? ""),
          contactName: String(formData.get("siteContactName") ?? ""),
          contactPhone: String(formData.get("siteContactPhone") ?? ""),
          notes: String(formData.get("siteNotes") ?? ""),
          logoFileName: uploadedPlantLogo?.fileName ?? existingPlantProfile.logoFileName,
          logoMimeType: uploadedPlantLogo?.mimeType ?? existingPlantProfile.logoMimeType,
          logoFileSize: uploadedPlantLogo?.fileSize ?? existingPlantProfile.logoFileSize,
          logoStoragePath: uploadedPlantLogo?.storagePath ?? existingPlantProfile.logoStoragePath,
        },
        user.plantId,
      );
    } else {
      redirect("/dashboardcm");
    }
  } catch {
    await deleteStoredFile(uploaded?.storagePath);
    await deleteStoredFile(uploadedPlantLogo?.storagePath);
    redirect("/admin/organization?error=1");
  }

  if (uploaded && existing.logoStoragePath !== uploaded.storagePath) {
    await deleteStoredFile(existing.logoStoragePath);
  }
  if (uploadedPlantLogo && existingPlantProfile.logoStoragePath !== uploadedPlantLogo.storagePath) {
    await deleteStoredFile(existingPlantProfile.logoStoragePath);
  }
  redirect("/admin/organization?saved=1");
}

export async function createOrganizationAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboardcm");

  const organization = normalizeOrganizationRecordInput({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });
  const existing = await db.organization.findFirst({
    where: { OR: [{ name: organization.name }, { slug: organization.slug }] },
    select: { id: true },
  });
  if (existing) redirect("/admin/organization?created=duplicate");

  const created = await db.organization.create({
    data: {
      name: organization.name,
      slug: organization.slug,
      active: true,
    },
  });
  await recordAudit({
    actorId: user.id,
    organizationId: created.id,
    entityType: "Organization",
    entityId: created.id,
    action: "CREATE_ORGANIZATION",
    after: { name: created.name, slug: created.slug, active: created.active },
  });
  redirect("/admin/organization?created=1");
}

export async function createOrganizationMapUserAction(formData: FormData) {
  "use server";
  const current = await requireUser();
  try {
    await createManagedUser(current, parseCreateManagedUserInput(formData));
  } catch (error) {
    const issue = getManagedUserMutationIssue(error);
    if (!issue) throw error;
    redirect(organizationUserFailureHref(issue));
  }
  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  redirect("/admin/organization?userStatus=created");
}

export async function updateOrganizationMapUserAction(formData: FormData) {
  "use server";
  const current = await requireUser();
  try {
    await updateManagedUser(current, parseUpdateManagedUserInput(formData));
  } catch (error) {
    const issue = getManagedUserMutationIssue(error);
    if (!issue) throw error;
    redirect(organizationUserFailureHref(issue));
  }
  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  redirect("/admin/organization?userStatus=saved");
}

function organizationUserFailureHref(issue: ManagedUserMutationIssue) {
  const status = issue === "organization-required" ? "orgRequired"
    : issue === "inventory-scope-required" ? "inventoryScopeRequired"
      : issue === "approval-scope-required" ? "approvalScopeRequired"
        : issue === "duplicate-username" ? "duplicate"
          : issue === "quota" ? "quota" : null;
  return status ? `/admin/organization?userStatus=${status}` : "/admin/organization";
}
function actorFrom(user: {
  id: string;
  role: string;
  categoryId: string | null;
  organizationId?: string | null;
  plantId?: string | null;
  siteAdminPermissions?: Actor["siteAdminPermissions"];
}): Actor {
  return {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    organizationId: user.organizationId,
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };
}
