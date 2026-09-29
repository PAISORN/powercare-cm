"use server";

import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import {
  claimWork,
  updateWorkRequest,
} from "../../modules/cm-work/cm-work-service";
import type { Actor, Urgency } from "../../modules/cm-work/cm-work-types";
import { buildWorkScopeWhere } from "../../modules/cm-work/work-list-query";
import {
  markStatusGroupRead,
  markWorkRead,
} from "../../modules/notifications/notification-service";
import { buildUserOperationalScope } from "../../modules/organization/user-plant-scope";
import { WorkStatus } from "../../modules/cm-work/cm-work-types";

export async function claimFromListAction(formData: FormData) {
  const currentUser = await requireUser();
  const workId = String(formData.get("workId") ?? "");
  await claimWork(actorFromUser(currentUser), workId);
  redirect(safeWorkReturnTo(formData));
}

export async function markStatusReadAction(formData: FormData) {
  const currentUser = await requireUser();
  const group = String(formData.get("group") ?? "");
  const scope = buildUserOperationalScope(currentUser);
  if (Object.values(WorkStatus).includes(group as WorkStatus)) {
    await markStatusGroupRead(currentUser.id, group, scope);
  }
}

export async function openWorkAction(formData: FormData) {
  const currentUser = await requireUser();
  const scope = buildUserOperationalScope(currentUser);
  const workId = String(formData.get("workId") ?? "");
  const work = await db.cmWork.findFirst({
    where: { id: workId, ...buildWorkScopeWhere(scope) },
    select: { id: true },
  });
  if (!work) redirect("/work");
  await markWorkRead(currentUser.id, work.id, scope);
  redirect(`/work/${work.id}`);
}

export async function updateWorkFromListAction(formData: FormData) {
  const currentUser = await requireUser();
  const scope = buildUserOperationalScope(currentUser);
  const workId = String(formData.get("workId") ?? "");
  const scopedWork = await db.cmWork.findFirst({
    where: { id: workId, ...buildWorkScopeWhere(scope) },
    select: { id: true },
  });
  if (!scopedWork) redirect("/work");
  await updateWorkRequest(
    {
      ...actorFromUser(currentUser),
      organizationId: currentUser.organizationId,
      plantId: scope.plantId,
      rolePermissionOverrides: currentUser.rolePermissionOverrides,
      userPermissionOverrides: currentUser.userPermissionOverrides,
    },
    workId,
    {
      requesterName: String(formData.get("requesterName") ?? ""),
      requesterDepartment: String(formData.get("requesterDepartment") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      zoneId: String(formData.get("zoneId") ?? ""),
      assetId: String(formData.get("assetId") ?? "") || null,
      machineName: String(formData.get("machineName") ?? ""),
      problemTitle: String(formData.get("problemTitle") ?? ""),
      problemDetail: String(formData.get("problemDetail") ?? ""),
      urgency: String(formData.get("urgency") ?? "") as Urgency,
    },
  );
  redirect(safeWorkReturnTo(formData));
}

function actorFromUser(
  user: Awaited<ReturnType<typeof requireUser>>,
): Actor {
  return {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };
}

function safeWorkReturnTo(formData: FormData) {
  const safeReturnTo = String(formData.get("returnTo") ?? "/work");
  return safeReturnTo.startsWith("/work") ? safeReturnTo : "/work";
}
