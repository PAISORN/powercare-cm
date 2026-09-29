import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import { canCloseWork } from "../auth/permission";
import {
  canUseUserPermission,
  PermissionKey,
} from "../auth/site-admin-permissions";
import { RoleName, WorkStatus, type Actor } from "../cm-work/cm-work-types";
import { StoreIssueStatus } from "../store/store-types";
import {
  buildStoreSections,
  filterActivityBoardItems,
  needsProgressUpdate,
  resolveActivityBoardFilters,
  storeFeedItem,
} from "./activity-page-model";
import type {
  ActivityFeedItem,
  ActivityPageData,
  ActivityPageQuery,
  ActivityScope,
  ActivityView,
} from "./activity-types";

export const ACTIVE_OWNER_STATUSES: string[] = [
  WorkStatus.CLAIMED,
  WorkStatus.IN_PROGRESS,
  WorkStatus.RETURNED_FOR_CORRECTION,
];

export async function loadActivityPageData(
  user: Awaited<ReturnType<typeof requireUser>>,
  scope: ActivityScope,
  query: ActivityPageQuery,
): Promise<ActivityPageData> {
  const canViewCmActivities = canUseUserPermission(
    user,
    PermissionKey.VIEW_MY_ACTIVITIES_CM,
  );
  const canViewStoreActivities = canUseUserPermission(
    user,
    PermissionKey.VIEW_MY_ACTIVITIES_STORE,
  );
  const activityView: ActivityView =
    query.activityView === "current" ? "current" : "visual";
  const actor: Actor = {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    plantId: scope.plant.id,
    siteAdminPermissions: user.siteAdminPermissions,
  };
  const userCategoryIds = [
    ...new Set(
      [
        user.categoryId,
        ...user.categories.map((category) => category.categoryId),
      ].filter(Boolean) as string[],
    ),
  ];
  const canApproveStore =
    canViewStoreActivities &&
    canUseUserPermission(user, PermissionKey.APPROVE_STORE_ISSUE);
  const canIssueStore =
    canViewStoreActivities &&
    canUseUserPermission(user, PermissionKey.ISSUE_STOCK);
  const approvalKinds =
    user.role === RoleName.ADMIN
      ? ["SPARE_PART", "CHEMICAL", "OIL"]
      : user.inventoryScopes
          .filter((item) => item.approvalEnabled)
          .map((item) => item.itemKind);
  const responsibilityKinds =
    user.role === RoleName.ADMIN
      ? ["SPARE_PART", "CHEMICAL", "OIL"]
      : user.inventoryScopes
          .filter((item) => item.responsibilityEnabled)
          .map((item) => item.itemKind);

  const [
    ownedWorks,
    waitingCloseWorks,
    approvalIssues,
    issueQueueIssues,
    requesterFollowUpIssues,
  ] = await Promise.all([
    canViewCmActivities
      ? db.cmWork.findMany({
          where: {
            organizationId: scope.organization.id,
            plantId: scope.plant.id,
            claimantId: user.id,
            status: { in: ACTIVE_OWNER_STATUSES },
          },
          include: { category: true, zone: true, claimant: true },
          orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
          take: 30,
        })
      : Promise.resolve([]),
    canViewCmActivities
      ? db.cmWork.findMany({
          where: {
            organizationId: scope.organization.id,
            plantId: scope.plant.id,
            status: WorkStatus.WAITING_TO_CLOSE,
            ...(user.role === RoleName.ENGINEER
              ? { categoryId: { in: userCategoryIds } }
              : {}),
          },
          include: { category: true, zone: true, claimant: true },
          orderBy: [{ waitingToCloseAt: "asc" }, { createdAt: "asc" }],
          take: 30,
        })
      : Promise.resolve([]),
    canApproveStore
      ? db.sparePartIssue.findMany({
          where: {
            plantId: scope.plant.id,
            status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
            itemKind: { in: approvalKinds },
            OR: [
              { requesterUserId: null },
              { requesterUserId: { not: user.id } },
            ],
          },
          include: {
            items: {
              include: { sparePart: { select: { code: true, name: true } } },
            },
          },
          orderBy: { requestedAt: "asc" },
          take: 30,
        })
      : Promise.resolve([]),
    canIssueStore
      ? db.sparePartIssue.findMany({
          where: {
            plantId: scope.plant.id,
            status: {
              in: [
                StoreIssueStatus.WAITING_STORE_ISSUE,
                StoreIssueStatus.PARTIALLY_ISSUED,
              ],
            },
            itemKind: { in: responsibilityKinds },
            AND: [
              {
                OR: [
                  { requesterUserId: null },
                  { requesterUserId: { not: user.id } },
                ],
              },
              {
                OR: [{ engineerId: null }, { engineerId: { not: user.id } }],
              },
            ],
          },
          include: {
            items: {
              include: { sparePart: { select: { code: true, name: true } } },
            },
          },
          orderBy: { requestedAt: "asc" },
          take: 30,
        })
      : Promise.resolve([]),
    canViewStoreActivities
      ? db.sparePartIssue.findMany({
          where: {
            plantId: scope.plant.id,
            requesterUserId: user.id,
            status: {
              in: [
                StoreIssueStatus.RETURNED_FOR_EDIT,
                StoreIssueStatus.NOT_ENOUGH_STOCK,
              ],
            },
          },
          include: {
            items: {
              include: { sparePart: { select: { code: true, name: true } } },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
  ]);

  const reviewWorks = waitingCloseWorks.filter((work) =>
    canCloseWork(actor, work),
  );
  const storeSections = buildStoreSections({
    approvalIssues,
    issueQueueIssues,
    requesterFollowUpIssues,
  });
  const totalStoreActivities = storeSections.reduce(
    (total, section) => total + section.issues.length,
    0,
  );
  const combinedActivities: ActivityFeedItem[] = [
    ...ownedWorks.map((work) => ({
      kind: "work" as const,
      key: `owned-${work.id}`,
      title: work.number,
      subtitle: `${work.problemTitle} · ${work.category.name} · ${work.zone.name}`,
      status: work.status,
      occurredAt: work.inProgressAt ?? work.claimedAt ?? work.createdAt,
      work,
      highlight: needsProgressUpdate(work),
    })),
    ...reviewWorks.map((work) => ({
      kind: "work" as const,
      key: `review-${work.id}`,
      title: work.number,
      subtitle: `Waiting close · ${work.problemTitle} · ${work.category.name}`,
      status: work.status,
      occurredAt: work.waitingToCloseAt ?? work.createdAt,
      work,
    })),
    ...approvalIssues.map((issue) => storeFeedItem(issue, "approve")),
    ...issueQueueIssues.map((issue) => storeFeedItem(issue, "issue")),
    ...requesterFollowUpIssues.map((issue) =>
      storeFeedItem(issue, "follow-up"),
    ),
  ].sort(
    (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
  );
  const activityBoardFilters = resolveActivityBoardFilters(query);
  const filteredBoardActivities = filterActivityBoardItems(
    combinedActivities,
    activityBoardFilters,
  );
  const selectedItem = query.selectedActivity
    ? (combinedActivities.find((item) => item.key === query.selectedActivity) ??
      null)
    : null;

  return {
    actor,
    activityView,
    activityBoardFilters,
    combinedActivities,
    filteredBoardActivities,
    selectedItem,
    ownedWorks,
    reviewWorks,
    storeSections,
    totalActivities:
      ownedWorks.length + reviewWorks.length + totalStoreActivities,
    totalStoreActivities,
  };
}
