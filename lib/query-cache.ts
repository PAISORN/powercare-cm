import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "./db";
import type { DashboardCategoryFilter, DashboardTimeRangeFilter } from "../modules/dashboard/dashboard-query";
import { DEFAULT_ORGANIZATION_ID, DEFAULT_PLANT_ID } from "../modules/organization/organization-foundation";
import type { OperationalScope } from "../modules/organization/user-plant-scope";
import type { ReportScope } from "../modules/reports/report-scope";

export const cacheTags = {
  dashboardSummary: "dashboard-summary",
  categories: "categories",
  zones: "zones",
  plants: "plants",
  usersActive: "users-active",
} as const;

const getAllCategoriesCached = unstable_cache(
  async () =>
    db.category.findMany({
      where: { OR: [{ organizationId: DEFAULT_ORGANIZATION_ID }, { organizationId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-categories"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getAllCategoriesForOrganizationCached = unstable_cache(
  async (organizationId: string) =>
    db.category.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-categories-for-organization"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getAllCategoriesForPlantCached = unstable_cache(
  async (plantId: string) =>
    db.category.findMany({
      where: { OR: [{ plantId }, { plantId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-categories-for-plant"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getAllCategoriesForAllOrganizationsCached = unstable_cache(
  async () =>
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-categories-for-all-organizations"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getAllZonesCached = unstable_cache(
  async () =>
    db.zone.findMany({
      where: { OR: [{ plantId: DEFAULT_PLANT_ID }, { plantId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-zones"],
  { revalidate: 300, tags: [cacheTags.zones] },
);

const getAllZonesForPlantCached = unstable_cache(
  async (plantId: string) =>
    db.zone.findMany({
      where: { OR: [{ plantId }, { plantId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-zones-for-plant"],
  { revalidate: 300, tags: [cacheTags.zones] },
);

const getAllZonesForAllPlantsCached = unstable_cache(
  async () =>
    db.zone.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-zones-for-all-plants"],
  { revalidate: 300, tags: [cacheTags.zones] },
);

const getAllZonesForOrganizationCached = unstable_cache(
  async (organizationId: string) =>
    db.zone.findMany({
      where: { OR: [{ plantId: null }, { plant: { organizationId } }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-zones-for-organization"],
  { revalidate: 300, tags: [cacheTags.zones] },
);

const getActiveCategoriesCached = unstable_cache(
  async () =>
    db.category.findMany({
      where: { active: true, OR: [{ organizationId: DEFAULT_ORGANIZATION_ID }, { organizationId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-categories"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getActiveCategoriesForOrganizationCached = unstable_cache(
  async (organizationId: string) =>
    db.category.findMany({
      where: { active: true, OR: [{ organizationId }, { organizationId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-categories-for-organization"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getActiveCategoriesForPlantCached = unstable_cache(
  async (plantId: string) =>
    db.category.findMany({
      where: { active: true, OR: [{ plantId }, { plantId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-categories-for-plant"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getActiveCategoriesForAllOrganizationsCached = unstable_cache(
  async () =>
    db.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-categories-for-all-organizations"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getActiveZonesCached = unstable_cache(
  async () =>
    db.zone.findMany({
      where: { active: true, OR: [{ plantId: DEFAULT_PLANT_ID }, { plantId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-zones"],
  { revalidate: 300, tags: [cacheTags.zones] },
);

const getActiveZonesForPlantCached = unstable_cache(
  async (plantId: string) =>
    db.zone.findMany({
      where: { active: true, OR: [{ plantId }, { plantId: null }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-zones-for-plant"],
  { revalidate: 300, tags: [cacheTags.zones] },
);

const getActiveZonesForAllPlantsCached = unstable_cache(
  async () =>
    db.zone.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-zones-for-all-plants"],
  { revalidate: 300, tags: [cacheTags.zones] },
);

const getActiveZonesForOrganizationCached = unstable_cache(
  async (organizationId: string) =>
    db.zone.findMany({
      where: { active: true, OR: [{ plantId: null }, { plant: { organizationId } }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-zones-for-organization"],
  { revalidate: 300, tags: [cacheTags.zones] },
);

const getActivePlantsCached = unstable_cache(
  async () =>
    db.plant.findMany({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ["active-plants"],
  { revalidate: 300, tags: [cacheTags.plants] },
);

const getActivePlantsForOrganizationCached = unstable_cache(
  async (organizationId: string) =>
    db.plant.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ["active-plants-for-organization"],
  { revalidate: 300, tags: [cacheTags.plants] },
);

const getActiveClaimantsCached = unstable_cache(
  async () =>
    db.user.findMany({
      where: { active: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ["active-claimants"],
  { revalidate: 300, tags: [cacheTags.usersActive] },
);

const getActiveClaimantsForPlantCached = unstable_cache(
  async (plantId: string) =>
    db.user.findMany({
      where: { active: true, plantId },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ["active-claimants-for-plant"],
  { revalidate: 300, tags: [cacheTags.usersActive] },
);

const getActiveClaimantsForOrganizationCached = unstable_cache(
  async (organizationId: string) =>
    db.user.findMany({
      where: { active: true, organizationId },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ["active-claimants-for-organization"],
  { revalidate: 300, tags: [cacheTags.usersActive] },
);

export const getCachedDashboardSummary = unstable_cache(
  async (
    category: DashboardCategoryFilter | undefined,
    timeRange: DashboardTimeRangeFilter | undefined,
    scope: OperationalScope | undefined,
  ) => {
    const { loadDashboardSummary } = await import("../modules/dashboard/dashboard-query");
    return loadDashboardSummary({ category, timeRange, scope });
  },
  ["dashboard-summary"],
  {
    revalidate: 60,
    tags: [cacheTags.dashboardSummary, cacheTags.categories, cacheTags.zones, cacheTags.usersActive],
  },
);

export function revalidateCmData(tags: string[] = Object.values(cacheTags)) {
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
}

export async function getAllCategories(organizationId = DEFAULT_ORGANIZATION_ID) {
  if (organizationId === DEFAULT_ORGANIZATION_ID) return getAllCategoriesCached();
  return getAllCategoriesForOrganizationCached(organizationId);
}

export async function getAllCategoriesForScope(organizationId?: string | null) {
  if (!organizationId) return getAllCategoriesForAllOrganizationsCached();
  return getAllCategories(organizationId);
}

export async function getAllCategoriesForPlantScope(plantId?: string | null, organizationId?: string | null) {
  if (plantId) return getAllCategoriesForPlantCached(plantId);
  return getAllCategoriesForScope(organizationId);
}

export async function getAllCategoriesLegacy() {
  return getAllCategoriesCached();
}

export async function getAllZones(plantId = DEFAULT_PLANT_ID) {
  if (plantId === DEFAULT_PLANT_ID) return getAllZonesCached();
  return getAllZonesForPlantCached(plantId);
}

export async function getAllZonesForScope(plantId?: string) {
  if (!plantId) return getAllZonesForAllPlantsCached();
  return getAllZones(plantId);
}

export async function getAllZonesForReportScope(scope?: ReportScope) {
  if (scope?.plantId) return getAllZones(scope.plantId);
  if (scope?.organizationId) return getAllZonesForOrganizationCached(scope.organizationId);
  return getAllZonesForAllPlantsCached();
}

export async function getAllZonesLegacy() {
  return getAllZonesCached();
}

export async function getActiveCategories(organizationId = DEFAULT_ORGANIZATION_ID) {
  if (organizationId === DEFAULT_ORGANIZATION_ID) return getActiveCategoriesCached();
  return getActiveCategoriesForOrganizationCached(organizationId);
}

export async function getActiveCategoriesForScope(organizationId?: string | null) {
  if (!organizationId) return getActiveCategoriesForAllOrganizationsCached();
  return getActiveCategories(organizationId);
}

export async function getActiveCategoriesForPlantScope(plantId?: string | null, organizationId?: string | null) {
  if (plantId) return getActiveCategoriesForPlantCached(plantId);
  return getActiveCategoriesForScope(organizationId);
}

export async function getActiveZones(plantId = DEFAULT_PLANT_ID) {
  if (plantId === DEFAULT_PLANT_ID) return getActiveZonesCached();
  return getActiveZonesForPlantCached(plantId);
}

export async function getActiveZonesForScope(plantId?: string) {
  if (!plantId) return getActiveZonesForAllPlantsCached();
  return getActiveZones(plantId);
}

export async function getActiveZonesForReportScope(scope?: ReportScope) {
  if (scope?.plantId) return getActiveZones(scope.plantId);
  if (scope?.organizationId) return getActiveZonesForOrganizationCached(scope.organizationId);
  return getActiveZonesForAllPlantsCached();
}

export async function getActivePlants() {
  return getActivePlantsCached();
}

export async function getActivePlantsForScope(organizationId?: string | null) {
  if (!organizationId || organizationId === DEFAULT_ORGANIZATION_ID) return getActivePlantsCached();
  return getActivePlantsForOrganizationCached(organizationId);
}

export async function getActiveClaimants(plantId?: string) {
  if (plantId) return getActiveClaimantsForPlantCached(plantId);
  return getActiveClaimantsCached();
}

export async function getActiveClaimantsForReportScope(scope?: ReportScope) {
  if (scope?.plantId) return getActiveClaimants(scope.plantId);
  if (scope?.organizationId) return getActiveClaimantsForOrganizationCached(scope.organizationId);
  return getActiveClaimantsCached();
}
