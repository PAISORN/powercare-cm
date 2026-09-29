import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import type { requireUser } from "../../lib/session";
import {
  canAssignWork,
  canCancelWork,
  canCloseWork,
} from "../auth/permission";
import { canUseUserPermission, PermissionKey } from "../auth/site-admin-permissions";
import { buildUserOperationalScope } from "../organization/user-plant-scope";
import { readEngineerAssignmentSetting } from "../settings/system-settings-service";
import { StoreIssueStatus } from "../store/store-types";
import { needsProgressUpdateReminder } from "./progress-update-reminder";
import { canEnterBacklogShutdown } from "./cm-work-state-machine";
import { RoleName, WorkStatus, type Actor } from "./cm-work-types";
import { buildWorkScopeWhere } from "./work-list-query";

type AuthenticatedUser = Awaited<ReturnType<typeof requireUser>>;

export type WorkDetailQuery = {
  assignmentError?: string;
  storeIssueBlocked?: string;
  storeIssueCreated?: string;
  storeIssueError?: string;
  workspaceTab?: string;
};

export const pendingStoreIssueStatuses = [
  StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
  StoreIssueStatus.RETURNED_FOR_EDIT,
  StoreIssueStatus.WAITING_STORE_ISSUE,
  StoreIssueStatus.PARTIALLY_ISSUED,
  StoreIssueStatus.NOT_ENOUGH_STOCK,
];

export async function loadWorkDetailPageData(
  user: AuthenticatedUser,
  id: string,
  query: WorkDetailQuery,
) {
  const scope = buildUserOperationalScope(user);
  const work = await db.cmWork.findFirstOrThrow({
    where: { id, ...buildWorkScopeWhere(scope) },
    include: {
      organization: { select: { name: true } },
      plant: { select: { name: true, code: true } },
      category: true,
      zone: true,
      claimant: true,
      reviewer: true,
      originatingPmWork: { select: { id: true, number: true } },
      statusHistory: { orderBy: { changedAt: "asc" } },
    },
  });
  if (!work.organizationId || !work.plantId) redirect("/dashboardcm");

  const statusActorIds = [
    ...new Set(
      work.statusHistory
        .map((event) => event.changedById)
        .filter((actorId): actorId is string => Boolean(actorId)),
    ),
  ];
  const workOrganizationId = work.organizationId;
  const workPlantId = work.plantId;
  const [statusActors, engineerAssignmentEnabled, storeIssues, storeStocks, issueZones] =
    await Promise.all([
      statusActorIds.length
        ? db.user.findMany({
            where: { id: { in: statusActorIds } },
            select: { id: true, fullName: true },
          })
        : Promise.resolve([]),
      readEngineerAssignmentSetting(workPlantId),
      db.sparePartIssue.findMany({
        where: {
          cmWorkId: work.id,
          organizationId: workOrganizationId,
          plantId: workPlantId,
        },
        select: {
          id: true,
          number: true,
          status: true,
          requestedAt: true,
          requesterUserId: true,
          items: {
            include: {
              store: { select: { code: true, name: true } },
              sparePart: { select: { code: true, name: true, unit: true } },
            },
            orderBy: { id: "asc" },
          },
        },
        orderBy: { requestedAt: "desc" },
      }),
      db.storeStock.findMany({
        where: {
          plantId: workPlantId,
          organizationId: workOrganizationId,
          quantity: { gt: 0 },
          store: { active: true },
          sparePart: { active: true },
        },
        include: {
          store: {
            select: {
              id: true,
              code: true,
              name: true,
              category: { select: { name: true } },
            },
          },
          sparePart: {
            select: {
              id: true,
              code: true,
              itemKind: true,
              itemCode: true,
              name: true,
              unit: true,
              minStock: true,
              category: { select: { name: true } },
              materialGroup: { select: { name: true } },
            },
          },
        },
        orderBy: [
          { store: { name: "asc" } },
          { sparePart: { name: "asc" } },
        ],
      }),
      db.storeApplicableZone.findMany({
        where: { plantId: workPlantId, active: true, zone: { active: true } },
        select: { code: true, zone: { select: { id: true, name: true } } },
        orderBy: { code: "asc" },
      }),
    ]);

  const actor: Actor = {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };
  const isClaimant = work.claimantId === user.id;
  const canReview = canCloseWork(actor, work);
  const canCancel = canCancelWork(actor, work);
  const canMoveToBacklogShutdown =
    canCancel && canEnterBacklogShutdown(work.status, work.claimant?.role);
  const canRelease =
    isClaimant &&
    (work.status === WorkStatus.CLAIMED ||
      work.status === WorkStatus.IN_PROGRESS);
  const hasPendingStoreIssues = storeIssues.some((issue) =>
    pendingStoreIssueStatuses.includes(
      issue.status as (typeof pendingStoreIssueStatuses)[number],
    ),
  );
  const canSubmit =
    isClaimant &&
    !hasPendingStoreIssues &&
    (work.status === WorkStatus.IN_PROGRESS ||
      work.status === WorkStatus.RETURNED_FOR_CORRECTION);
  const canRequestStoreIssue =
    isClaimant &&
    canUseUserPermission(user, PermissionKey.CREATE_STORE_ISSUE) &&
    (work.status === WorkStatus.CLAIMED ||
      work.status === WorkStatus.IN_PROGRESS ||
      work.status === WorkStatus.RETURNED_FOR_CORRECTION);
  const latestWorkActivityAt = work.statusHistory.at(-1)?.changedAt ?? null;
  const shouldUpdateProgress =
    isClaimant && needsProgressUpdateReminder(work, latestWorkActivityAt);
  const mayAssign = canAssignWork(actor, work, engineerAssignmentEnabled);
  const technicians = mayAssign
    ? await db.user.findMany({
        where: {
          active: true,
          role: RoleName.TECHNICIAN,
          plantId: work.plantId,
          OR: [
            { categoryId: work.categoryId },
            { categories: { some: { categoryId: work.categoryId } } },
          ],
        },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      })
    : [];

  return {
    user,
    query,
    work,
    workOrganizationId,
    workPlantId,
    actor,
    statusActorNameById: new Map(
      statusActors.map((statusActor) => [
        statusActor.id,
        statusActor.fullName,
      ]),
    ),
    storeIssues,
    storeStocks,
    issueZones,
    isClaimant,
    canReview,
    canCancel,
    canMoveToBacklogShutdown,
    canRelease,
    hasPendingStoreIssues,
    canSubmit,
    canRequestStoreIssue,
    shouldUpdateProgress,
    mayAssign,
    technicians,
    workspaceTab: query.workspaceTab === "issue" ? "issue" : "operations",
  };
}

export type WorkDetailPageData = Awaited<
  ReturnType<typeof loadWorkDetailPageData>
>;

export function buildStoreStockStatus(quantity: number, minStock: number) {
  if (quantity <= 0) return "OUT";
  if (quantity <= minStock) return "LOW";
  return "ENOUGH";
}
