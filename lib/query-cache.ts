import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "./db";
import type { DashboardCategoryFilter, DashboardTimeRangeFilter } from "../modules/dashboard/dashboard-query";

export const cacheTags = {
  dashboardSummary: "dashboard-summary",
  categories: "categories",
  zones: "zones",
  usersActive: "users-active",
} as const;

const getAllCategoriesCached = unstable_cache(
  async () =>
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-categories"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getAllZonesCached = unstable_cache(
  async () =>
    db.zone.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ["all-zones"],
  { revalidate: 300, tags: [cacheTags.zones] },
);

const getActiveCategoriesCached = unstable_cache(
  async () =>
    db.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-categories"],
  { revalidate: 300, tags: [cacheTags.categories] },
);

const getActiveZonesCached = unstable_cache(
  async () =>
    db.zone.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ["active-zones"],
  { revalidate: 300, tags: [cacheTags.zones] },
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

export const getCachedDashboardSummary = unstable_cache(
  async (
    category: DashboardCategoryFilter | undefined,
    timeRange: DashboardTimeRangeFilter | undefined,
  ) => {
    const { loadDashboardSummary } = await import("../modules/dashboard/dashboard-query");
    return loadDashboardSummary({ category, timeRange });
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

export async function getAllCategories() {
  return getAllCategoriesCached();
}

export async function getAllZones() {
  return getAllZonesCached();
}

export async function getActiveCategories() {
  return getActiveCategoriesCached();
}

export async function getActiveZones() {
  return getActiveZonesCached();
}

export async function getActiveClaimants() {
  return getActiveClaimantsCached();
}
