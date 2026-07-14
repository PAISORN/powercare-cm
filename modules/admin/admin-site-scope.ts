import { db } from "../../lib/db";
import { RoleName, isSiteAdminRole } from "../cm-work/cm-work-types";
import { DEFAULT_ORGANIZATION_ID, DEFAULT_PLANT_ID } from "../organization/organization-foundation";
import type { PermissionUserContext } from "../auth/site-admin-permissions";

export type AdminSiteScopeSearch = {
  organizationId?: string;
  plantId?: string;
};

export type AdminSiteScope = {
  organization: { id: string; name: string; slug: string };
  plant: { id: string; name: string; code: string };
  organizations: { id: string; name: string; slug: string }[];
  plants: { id: string; name: string; code: string }[];
  canSelectOrganization: boolean;
  canSelectPlant: boolean;
};

export function adminScopeSearchFromFormData(formData: FormData): AdminSiteScopeSearch {
  return {
    organizationId: String(formData.get("organizationId") ?? "") || undefined,
    plantId: String(formData.get("plantId") ?? "") || undefined,
  };
}

export async function resolveAdminSiteScope(user: PermissionUserContext, search: AdminSiteScopeSearch = {}): Promise<AdminSiteScope> {
  if (user.role === RoleName.ADMIN) return resolveOwnerAdminSiteScope(search);
  if (user.role === RoleName.ORGANIZATION_ADMIN) return resolveOrganizationAdminSiteScope(user, search);
  if (isSiteAdminRole(user.role)) return resolveFixedSiteScope(user);
  throw new Error("Only admin roles can select site scope");
}

async function resolveOwnerAdminSiteScope(search: AdminSiteScopeSearch): Promise<AdminSiteScope> {
  const organizations = await db.organization.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  const organizationId = normalizeId(search.organizationId, organizations) ?? normalizeId(DEFAULT_ORGANIZATION_ID, organizations) ?? organizations[0]?.id;
  const plants = organizationId ? await listPlantsForOrganization(organizationId) : [];
  const plantId = normalizeId(search.plantId, plants) ?? normalizeId(DEFAULT_PLANT_ID, plants) ?? plants[0]?.id;

  return {
    organization: organizations.find((organization) => organization.id === organizationId) ?? fallbackOrganization,
    plant: plants.find((plant) => plant.id === plantId) ?? fallbackPlant,
    organizations,
    plants,
    canSelectOrganization: true,
    canSelectPlant: true,
  };
}

async function resolveOrganizationAdminSiteScope(user: PermissionUserContext, search: AdminSiteScopeSearch): Promise<AdminSiteScope> {
  if (!user.organizationId) throw new Error("Organization Admin account is not assigned to an Organization.");
  const organizationId = user.organizationId;
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true },
  });
  const plants = await listPlantsForOrganization(organizationId);
  const plantId = normalizeId(search.plantId, plants) ?? normalizeId(user.plantId, plants) ?? plants[0]?.id;

  return {
    organization: organization ?? fallbackOrganization,
    plant: plants.find((plant) => plant.id === plantId) ?? fallbackPlant,
    organizations: organization ? [organization] : [],
    plants,
    canSelectOrganization: false,
    canSelectPlant: true,
  };
}

async function resolveFixedSiteScope(user: PermissionUserContext): Promise<AdminSiteScope> {
  if (!user.plantId) throw new Error("Site account is not assigned to a Site.");
  const plant = await db.plant.findUnique({
    where: { id: user.plantId },
    select: { id: true, name: true, code: true, organization: { select: { id: true, name: true, slug: true } } },
  });

  return {
    organization: plant?.organization ?? fallbackOrganization,
    plant: plant ? { id: plant.id, name: plant.name, code: plant.code } : fallbackPlant,
    organizations: plant?.organization ? [plant.organization] : [],
    plants: plant ? [{ id: plant.id, name: plant.name, code: plant.code }] : [],
    canSelectOrganization: false,
    canSelectPlant: false,
  };
}

function listPlantsForOrganization(organizationId: string) {
  return db.plant.findMany({
    where: { organizationId, active: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

function normalizeId<T extends { id: string }>(id: string | null | undefined, options: T[]) {
  if (!id) return null;
  return options.some((option) => option.id === id) ? id : null;
}

const fallbackOrganization = {
  id: DEFAULT_ORGANIZATION_ID,
  name: "PowerCare.CM",
  slug: "powercare",
};

const fallbackPlant = {
  id: DEFAULT_PLANT_ID,
  name: "PowerCare.CM",
  code: "main",
};
