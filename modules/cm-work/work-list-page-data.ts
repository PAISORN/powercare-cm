import { db } from "../../lib/db";
import {
  getActiveCategoriesForPlantScope,
  getActiveClaimantsForReportScope,
  getActiveZonesForReportScope,
} from "../../lib/query-cache";
import type { requireUser } from "../../lib/session";
import { canUseUserPermission, PermissionKey } from "../auth/site-admin-permissions";
import { hasExplicitCmDateFilter } from "../filters/cm-date-filter";
import {
  getUnreadSummary,
  getUnreadWorkIds,
} from "../notifications/notification-service";
import { buildUserOperationalScope } from "../organization/user-plant-scope";
import { WorkStatus, type Actor } from "./cm-work-types";
import {
  buildWorkListHref,
  buildWorkWhere,
  normalizePage,
  normalizeWorkFilters,
  safeParseDateFilter,
  WORK_LIST_PAGE_SIZE,
  type WorkSearchParams,
} from "./work-list-query";

type AuthenticatedUser = Awaited<ReturnType<typeof requireUser>>;

export async function loadWorkListPageData(
  user: AuthenticatedUser,
  rawFilters: WorkSearchParams,
) {
  const filters = normalizeWorkFilters(rawFilters);
  const hasExplicitDateFilter = hasExplicitCmDateFilter(filters);
  const dateFilter = safeParseDateFilter(filters, hasExplicitDateFilter);
  const scope = buildUserOperationalScope(user);
  const where = buildWorkWhere(filters, dateFilter, scope);
  const statusSummaryWhere = buildWorkWhere(
    { ...filters, status: undefined, statusGroup: undefined },
    dateFilter,
    scope,
  );
  const requestedPage = normalizePage(filters.page);
  const skip = (requestedPage - 1) * WORK_LIST_PAGE_SIZE;
  const actor: Actor = {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };
  const returnTo = buildWorkListHref(filters);
  const canEditWorkRequest = canUseUserPermission(
    user,
    PermissionKey.EDIT_WORK_REQUEST,
  );

  const [works, total, categories, zones, claimants, byStatus, unreadSummary] =
    await Promise.all([
      db.cmWork.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: WORK_LIST_PAGE_SIZE,
        include: {
          category: true,
          zone: true,
          claimant: { include: { profilePhoto: true } },
          statusHistory: { orderBy: { changedAt: "desc" }, take: 1 },
        },
      }),
      db.cmWork.count({ where }),
      getActiveCategoriesForPlantScope(
        scope.plantId,
        scope.organizationId ?? user.organizationId,
      ),
      getActiveZonesForReportScope(scope),
      getActiveClaimantsForReportScope(scope),
      db.cmWork.groupBy({
        by: ["status"],
        where: statusSummaryWhere,
        _count: { _all: true },
      }),
      getUnreadSummary(user.id, scope),
    ]);

  const unreadWorkIds = await getUnreadWorkIds(
    user.id,
    works.map((work) => work.id),
    scope,
  );
  const editWork =
    canEditWorkRequest && filters.editWorkId
      ? (works.find((work) => work.id === filters.editWorkId) ?? null)
      : null;
  const [editCategories, editZones, editAssets] = editWork?.plantId
    ? await Promise.all([
        db.category.findMany({
          where: {
            active: true,
            AND: [
              {
                OR: [
                  { organizationId: editWork.organizationId },
                  { organizationId: null },
                ],
              },
              {
                OR: [
                  { plantId: editWork.plantId },
                  { plantId: null },
                ],
              },
            ],
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        db.zone.findMany({
          where: {
            active: true,
            OR: [{ plantId: editWork.plantId }, { plantId: null }],
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        db.asset.findMany({
          where: {
            registrationStatus: "ACTIVE",
            plantId: editWork.plantId,
          },
          select: {
            id: true,
            code: true,
            nameEn: true,
            nameTh: true,
            zoneId: true,
          },
          orderBy: [{ code: "asc" }, { nameTh: "asc" }],
        }),
      ])
    : [[], [], []];

  const totalPages = Math.max(1, Math.ceil(total / WORK_LIST_PAGE_SIZE));

  return {
    actor,
    filters,
    hasExplicitDateFilter,
    returnTo,
    workListPositionKey: `work:${returnTo}`,
    canEditWorkRequest,
    works,
    total,
    categories,
    zones,
    claimants,
    unreadSummary,
    unreadWorkIds,
    editWork,
    editCategories,
    editZones,
    editAssets,
    statusCountByKey: new Map(
      byStatus.map((item) => [item.status as WorkStatus, item._count._all]),
    ),
    totalPages,
    currentPage: Math.min(requestedPage, totalPages),
  };
}

export type WorkListPageData = Awaited<
  ReturnType<typeof loadWorkListPageData>
>;
