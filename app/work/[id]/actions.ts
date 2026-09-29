"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { reasonSchema, workCompletionSchema } from "../../../lib/validation";
import {
  assignWork,
  cancelWork,
  claimWork,
  closeWork,
  moveToBacklogShutdown,
  moveToInProgress,
  releaseWork,
  returnForCorrection,
  submitForReview,
} from "../../../modules/cm-work/cm-work-service";
import { WorkStatus, type Actor } from "../../../modules/cm-work/cm-work-types";
import { buildWorkScopeWhere } from "../../../modules/cm-work/work-list-query";
import { buildUserOperationalScope } from "../../../modules/organization/user-plant-scope";
import { storeIssueActionError } from "../../../modules/store/store-issue-action-error";
import { parseStoreIssueFormData } from "../../../modules/store/store-issue-form-data";
import { createLoggedInStoreIssue } from "../../../modules/store/store-issue-prisma";
import { StoreIssueStatus } from "../../../modules/store/store-types";
import { pendingStoreIssueStatuses } from "../../../modules/cm-work/work-detail-page-data";

export async function claimWorkDetailAction(id: string) {
  await claimWork(await getActor(), id);
  redirect(workHref(id));
}

export async function assignWorkDetailAction(id: string, formData: FormData) {
  const technicianId = String(formData.get("technicianId") ?? "").trim();
  if (!technicianId) redirect(`${workHref(id)}?assignmentError=1`);
  try {
    await assignWork(await getActor(), id, technicianId);
  } catch {
    redirect(`${workHref(id)}?assignmentError=1`);
  }
  redirect(workHref(id));
}

export async function startWorkDetailAction(id: string) {
  await moveToInProgress(await getActor(), id);
  redirect(workHref(id));
}

export async function submitWorkReviewAction(id: string, formData: FormData) {
  const pendingCount = await db.sparePartIssue.count({
    where: { cmWorkId: id, status: { in: pendingStoreIssueStatuses } },
  });
  const hasPendingStoreIssues = pendingCount > 0;
  if (hasPendingStoreIssues) {
    redirect(`${workHref(id)}?storeIssueBlocked=1`);
  }
  const parsed = workCompletionSchema.parse({
    rootCause: formData.get("rootCause"),
    correctiveAction: formData.get("correctiveAction"),
    workNote: formData.get("workNote"),
  });
  await submitForReview(await getActor(), id, parsed);
  redirect(workHref(id));
}

export async function releaseWorkDetailAction(id: string, formData: FormData) {
  const parsed = reasonSchema.parse({ reason: formData.get("reason") });
  await releaseWork(await getActor(), id, parsed.reason);
  redirect(workHref(id));
}

export async function moveWorkToBacklogShutdownAction(
  id: string,
  formData: FormData,
) {
  const parsed = reasonSchema.parse({ reason: formData.get("reason") });
  await moveToBacklogShutdown(await getActor(), id, parsed.reason);
  redirect(workHref(id));
}

export async function returnWorkDetailAction(id: string, formData: FormData) {
  const parsed = reasonSchema.parse({ reason: formData.get("reason") });
  await returnForCorrection(await getActor(), id, parsed.reason);
  redirect(workHref(id));
}

export async function closeWorkDetailAction(id: string, formData: FormData) {
  await closeWork(
    await getActor(),
    id,
    String(formData.get("engineerNote") ?? ""),
  );
  redirect(workHref(id));
}

export async function cancelWorkDetailAction(id: string, formData: FormData) {
  const parsed = reasonSchema.parse({ reason: formData.get("reason") });
  await cancelWork(await getActor(), id, parsed.reason);
  redirect(workHref(id));
}

export async function updateWorkProgressAction(id: string, formData: FormData) {
  const currentUser = await requireUser();
  const actor = await getActor();
  const note = String(formData.get("progressNote") ?? "").trim();
  if (!note) redirect(workHref(id));

  const actionScope = buildUserOperationalScope(currentUser);
  const currentWork = await db.cmWork.findFirstOrThrow({
    where: { id, claimantId: actor.id, ...buildWorkScopeWhere(actionScope) },
  });
  if (
    currentWork.status !== WorkStatus.CLAIMED &&
    currentWork.status !== WorkStatus.IN_PROGRESS
  ) {
    redirect(workHref(id));
  }

  await db.$transaction([
    db.statusHistory.create({
      data: {
        cmWorkId: id,
        fromStatus: currentWork.status,
        toStatus: currentWork.status,
        changedById: actor.id,
        note,
      },
    }),
    db.auditEvent.create({
      data: {
        cmWorkId: id,
        actorId: actor.id,
        organizationId: currentUser.organizationId,
        plantId: currentWork.plantId,
        entityType: "CmWork",
        entityId: id,
        action: "UPDATE_WORK_PROGRESS",
        afterJson: JSON.stringify({ status: currentWork.status, note }),
      },
    }),
  ]);
  revalidatePath(workHref(id));
  redirect(workHref(id));
}

export async function createWorkStoreIssueAction(id: string, formData: FormData) {
  const currentUser = await requireUser();
  const actor = await getActor();
  const actionScope = buildUserOperationalScope(currentUser);
  const currentWork = await db.cmWork.findFirstOrThrow({
    where: { id, claimantId: actor.id, ...buildWorkScopeWhere(actionScope) },
    select: {
      id: true,
      number: true,
      status: true,
      organizationId: true,
      plantId: true,
      machineName: true,
      problemTitle: true,
    },
  });
  if (!currentWork.organizationId || !currentWork.plantId) {
    redirect(`${workHref(id)}?storeIssueError=site-scope`);
  }
  const currentPlant = await db.plant.findUniqueOrThrow({
    where: { id: currentWork.plantId },
    select: { inventoryCode: true },
  });
  if (
    currentWork.status !== WorkStatus.CLAIMED &&
    currentWork.status !== WorkStatus.IN_PROGRESS &&
    currentWork.status !== WorkStatus.RETURNED_FOR_CORRECTION
  ) {
    redirect(`${workHref(id)}?storeIssueError=work-status`);
  }

  const issueInput = parseStoreIssueFormData(formData);
  const items = issueInput.items.filter(
    (item) =>
      item.storeId &&
      item.sparePartId &&
      Number.isFinite(item.requestedQty) &&
      item.requestedQty > 0,
  );
  let createdNumber: string | null = null;
  let actionError: string | null = null;
  try {
    const created = await createLoggedInStoreIssue(
      currentUser,
      {
        organizationId: currentWork.organizationId,
        plantId: currentWork.plantId,
        plantCode: currentPlant.inventoryCode ?? "",
      },
      {
        ...issueInput,
        issueType: "CM_REFERENCED",
        cmWorkNumber: currentWork.number,
        requesterName: currentUser.fullName,
        note: issueInput.note ?? `Request from ${currentWork.number}`,
        requestedAt: new Date(),
        items,
      },
    );
    createdNumber = created.number;
    await db.auditEvent.create({
      data: {
        cmWorkId: currentWork.id,
        actorId: currentUser.id,
        organizationId: currentWork.organizationId,
        plantId: currentWork.plantId,
        entityType: "SparePartIssue",
        entityId: created.id,
        action: "STORE_ISSUE_FROM_WORK_DETAIL",
        afterJson: JSON.stringify({
          number: created.number,
          cmWorkNumber: currentWork.number,
          itemCount: items.length,
        }),
      },
    });
  } catch (error) {
    actionError = storeIssueActionError(
      error,
      "ไม่สามารถสร้างใบเบิกได้ โปรดตรวจสอบข้อมูลและลองใหม่",
    );
  }
  const feedback = createdNumber
    ? `?storeIssueCreated=${createdNumber}`
    : `?storeIssueError=${encodeURIComponent(actionError ?? "Unknown error")}`;
  redirect(`${workHref(id)}${feedback}`);
}

export async function cancelOwnPendingStoreIssueAction(
  id: string,
  formData: FormData,
) {
  const currentUser = await requireUser();
  const issueId = String(formData.get("issueId") ?? "").trim();
  if (!issueId) redirect(workHref(id));

  const actionScope = buildUserOperationalScope(currentUser);
  const currentWork = await db.cmWork.findFirstOrThrow({
    where: { id, ...buildWorkScopeWhere(actionScope) },
    select: { id: true, organizationId: true, plantId: true },
  });
  if (!currentWork.organizationId || !currentWork.plantId) {
    redirect(workHref(id));
  }
  const issue = await db.sparePartIssue.findFirst({
    where: {
      id: issueId,
      cmWorkId: currentWork.id,
      organizationId: currentWork.organizationId,
      plantId: currentWork.plantId,
      requesterUserId: currentUser.id,
      status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
    },
    select: { id: true, number: true },
  });
  if (!issue) redirect(`${workHref(id)}?storeIssueError=cannot-cancel`);

  await db.$transaction([
    db.auditEvent.create({
      data: {
        cmWorkId: currentWork.id,
        actorId: currentUser.id,
        organizationId: currentWork.organizationId,
        plantId: currentWork.plantId,
        entityType: "SparePartIssue",
        entityId: issue.id,
        action: "CANCEL_PENDING_STORE_ISSUE",
        afterJson: JSON.stringify({ number: issue.number }),
      },
    }),
    db.sparePartIssue.delete({ where: { id: issue.id } }),
  ]);
  revalidatePath(workHref(id));
  redirect(workHref(id));
}

async function getActor(): Promise<Actor> {
  const user = await requireUser();
  return {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };
}

function workHref(id: string) {
  return `/work/${id}`;
}
