import { db } from "../../lib/db";
import { PermissionKey } from "../auth/site-admin-permissions";
import {
  approveStoreIssueByEngineer,
  cancelStoreIssueWithRepository,
  issueApprovedStoreIssue,
  markStoreIssueNotEnoughStock,
  rejectStoreIssueByEngineer,
  returnStoreIssueForEdit,
} from "./store-issue-service";
import { RoleName } from "../cm-work/cm-work-types";
import {
  assertActorStoreScope,
  requireStorePermission,
} from "./store-authorization";
import { StoreIssueStatus, type StoreScope } from "./store-types";
import {
  getIssueItemKind,
  hasInventoryApproval,
  hasInventoryResponsibility,
} from "./inventory-user-scope";
import { dispatchStoreIssueLineEvent } from "./store-issue-line-events";
import { createIssueRepository } from "./store-issue-repository-prisma";
import { optionalText } from "./store-issue-values";
import {
  type StoreIssuePrismaActor,
  writeStoreIssueAudit,
} from "./store-issue-prisma-shared";

export {
  createLoggedInStoreIssue,
  createPublicStoreIssue,
} from "./store-issue-create-prisma";
export type { CreateLoggedInStoreIssueInput } from "./store-issue-create-prisma";

export async function approveStoreIssue(
  actor: StoreIssuePrismaActor,
  scope: StoreScope,
  issueId: string,
  decision: "APPROVE" | "REJECT" | "RETURN",
  reason?: string | null,
) {
  requireStorePermission(actor, PermissionKey.APPROVE_STORE_ISSUE);
  assertActorStoreScope(actor, scope);
  await db.$transaction(async (tx) => {
    const issue = await getIssueItemKind(tx, issueId, scope.plantId);
    if (!hasInventoryApproval(actor, issue.itemKind))
      throw new Error("No approval scope for this inventory type.");
    if (issue.requesterUserId === actor.id)
      throw new Error("The requester cannot approve their own issue.");
    const repository = createIssueRepository(tx);
    if (decision === "APPROVE") {
      const ownerOverride = actor.role === "ADMIN" && Boolean(reason?.trim());
      await approveStoreIssueByEngineer(
        repository,
        actor,
        scope,
        issueId,
        new Date(),
        ownerOverride,
      );
    } else if (decision === "RETURN") {
      await returnStoreIssueForEdit(
        repository,
        actor,
        scope,
        issueId,
        reason ?? "",
      );
    } else {
      await rejectStoreIssueByEngineer(
        repository,
        actor,
        scope,
        issueId,
        reason ?? "",
      );
    }
    await writeStoreIssueAudit(
      tx,
      actor.id,
      scope,
      issueId,
      `STORE_ISSUE_${decision}`,
      { reason: optionalText(reason) },
    );
  });
  await dispatchStoreIssueLineEvent(
    issueId,
    decision === "APPROVE" ? "STORE_ISSUE_APPROVED" : "STORE_ISSUE_REJECTED",
    actor.fullName,
  );
}

export async function issueStoreStock(
  actor: StoreIssuePrismaActor,
  scope: StoreScope,
  issueId: string,
) {
  requireStorePermission(actor, PermissionKey.ISSUE_STOCK);
  assertActorStoreScope(actor, scope);
  const result = await db.$transaction(async (tx) => {
    const issue = await getIssueItemKind(tx, issueId, scope.plantId);
    if (!hasInventoryResponsibility(actor, issue.itemKind))
      throw new Error("No issue scope for this inventory type.");
    if (issue.requesterUserId === actor.id)
      throw new Error("The requester cannot issue their own request.");
    if (issue.engineerId === actor.id)
      throw new Error("The approver cannot issue the same request.");
    const repository = createIssueRepository(tx);
    const result = await issueApprovedStoreIssue(
      repository,
      actor,
      scope,
      issueId,
    );
    await writeStoreIssueAudit(
      tx,
      actor.id,
      scope,
      issueId,
      "ISSUE_STORE_STOCK",
      {
        mode: "FULL_ISSUE",
        status: result.status,
      },
    );
    return result;
  });
  await dispatchStoreIssueLineEvent(
    issueId,
    result.status === StoreIssueStatus.NOT_ENOUGH_STOCK
      ? "STORE_NOT_ENOUGH_STOCK"
      : "STORE_ISSUE_ISSUED",
    actor.fullName,
  );
  return result;
}

export async function markIssueNotEnoughStock(
  actor: StoreIssuePrismaActor,
  scope: StoreScope,
  issueId: string,
  reason: string,
) {
  requireStorePermission(actor, PermissionKey.ISSUE_STOCK);
  assertActorStoreScope(actor, scope);
  await db.$transaction(async (tx) => {
    const issue = await getIssueItemKind(tx, issueId, scope.plantId);
    if (!hasInventoryResponsibility(actor, issue.itemKind))
      throw new Error("No issue scope for this inventory type.");
    if (issue.requesterUserId === actor.id || issue.engineerId === actor.id)
      throw new Error(
        "This request requires separate users for request, approval, and issue.",
      );
    const repository = createIssueRepository(tx);
    await markStoreIssueNotEnoughStock(
      repository,
      actor,
      scope,
      issueId,
      reason,
      new Date(),
    );
    await writeStoreIssueAudit(
      tx,
      actor.id,
      scope,
      issueId,
      "STORE_ISSUE_NOT_ENOUGH_STOCK",
      { reason: reason.trim() },
    );
  });
  await dispatchStoreIssueLineEvent(
    issueId,
    "STORE_NOT_ENOUGH_STOCK",
    actor.fullName,
  );
}

export async function cancelStoreIssue(
  actor: StoreIssuePrismaActor,
  scope: StoreScope,
  issueId: string,
  reason: string,
) {
  if (actor.role === RoleName.ENGINEER) {
    requireStorePermission(actor, PermissionKey.APPROVE_STORE_ISSUE);
  } else if (actor.role === RoleName.STORE_OFFICER) {
    requireStorePermission(actor, PermissionKey.ISSUE_STOCK);
  } else if (actor.role !== RoleName.ADMIN) {
    throw new Error(
      "Only Engineer, Store Officer, or Owner Admin can cancel a Store issue.",
    );
  }
  assertActorStoreScope(actor, scope);

  await db.$transaction(async (tx) => {
    const repository = createIssueRepository(tx);
    await cancelStoreIssueWithRepository(
      repository,
      actor,
      scope,
      issueId,
      reason,
      new Date(),
    );
    await writeStoreIssueAudit(
      tx,
      actor.id,
      scope,
      issueId,
      "CANCEL_STORE_ISSUE",
      { reason: reason.trim() },
    );
  });
}
