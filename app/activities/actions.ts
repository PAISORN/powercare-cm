"use server";

import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import { adminScopeSearchFromFormData } from "../../modules/admin/admin-site-scope";
import type { Actor } from "../../modules/cm-work/cm-work-types";
import {
  closeWork,
  moveToInProgress,
  returnForCorrection,
  submitForReview,
} from "../../modules/cm-work/cm-work-service";
import { activityRedirect } from "../../modules/activities/activity-page-model";
import type { ActivityScope } from "../../modules/activities/activity-types";
import {
  approveStoreIssue,
  cancelStoreIssue,
  issueStoreStock,
  markIssueNotEnoughStock,
} from "../../modules/store/store-issue-prisma";
import { resolveStorePageScope } from "../../modules/store/store-page-scope";
import { StoreIssueStatus } from "../../modules/store/store-types";

const PENDING_STORE_ISSUE_STATUSES: string[] = [
  StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
  StoreIssueStatus.WAITING_STORE_ISSUE,
  StoreIssueStatus.PARTIALLY_ISSUED,
  StoreIssueStatus.RETURNED_FOR_EDIT,
];
export async function engineerDecisionFromActivity(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  try {
    await approveStoreIssue(
      user,
      storeScopeFromActivity(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("decision") ?? "") as "APPROVE" | "REJECT" | "RETURN",
      optionalActivityText(formData.get("reason")),
    );
  } catch (error) {
    redirect(
      activityRedirect(scope, { storeError: activityActionError(error) }),
    );
  }
  redirect(activityRedirect(scope, { storeSaved: "engineer" }));
}

export async function issueStockFromActivity(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  try {
    await issueStoreStock(
      user,
      storeScopeFromActivity(scope),
      String(formData.get("issueId") ?? ""),
    );
  } catch (error) {
    redirect(
      activityRedirect(scope, { storeError: activityActionError(error) }),
    );
  }
  redirect(activityRedirect(scope, { storeSaved: "issued" }));
}

export async function notEnoughStockFromActivity(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  try {
    await markIssueNotEnoughStock(
      user,
      storeScopeFromActivity(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    redirect(
      activityRedirect(scope, { storeError: activityActionError(error) }),
    );
  }
  redirect(activityRedirect(scope, { storeSaved: "not-enough" }));
}

export async function cancelStoreIssueFromActivity(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  try {
    await cancelStoreIssue(
      user,
      storeScopeFromActivity(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    redirect(
      activityRedirect(scope, { storeError: activityActionError(error) }),
    );
  }
  redirect(activityRedirect(scope, { storeSaved: "canceled" }));
}

export async function startWorkFromActivity(formData: FormData) {
  "use server";
  const { actor, scope } = await activityActionContext(formData);
  try {
    await moveToInProgress(actor, String(formData.get("cmWorkId") ?? ""));
  } catch (error) {
    redirect(
      activityRedirect(scope, {
        activityView: "visual",
        storeError: activityActionError(error),
      }),
    );
  }
  redirect(activityRedirect(scope, { activityView: "visual" }));
}

export async function submitWorkReviewFromActivity(formData: FormData) {
  "use server";
  const { actor, scope } = await activityActionContext(formData);
  const cmWorkId = String(formData.get("cmWorkId") ?? "");
  const pendingCount = await db.sparePartIssue.count({
    where: { cmWorkId, status: { in: PENDING_STORE_ISSUE_STATUSES } },
  });
  if (pendingCount > 0) {
    redirect(
      activityRedirect(scope, {
        activityView: "visual",
        storeError: "Please finish pending store issues first.",
      }),
    );
  }
  try {
    await submitForReview(actor, cmWorkId, {
      correctiveAction: String(formData.get("correctiveAction") ?? ""),
      rootCause: String(formData.get("rootCause") ?? ""),
      workNote: optionalActivityText(formData.get("workNote")) ?? undefined,
    });
  } catch (error) {
    redirect(
      activityRedirect(scope, {
        activityView: "visual",
        storeError: activityActionError(error),
      }),
    );
  }
  redirect(activityRedirect(scope, { activityView: "visual" }));
}

export async function closeWorkFromActivity(formData: FormData) {
  "use server";
  const { actor, scope } = await activityActionContext(formData);
  try {
    await closeWork(
      actor,
      String(formData.get("cmWorkId") ?? ""),
      String(formData.get("engineerNote") ?? ""),
    );
  } catch (error) {
    redirect(
      activityRedirect(scope, {
        activityView: "visual",
        storeError: activityActionError(error),
      }),
    );
  }
  redirect(activityRedirect(scope, { activityView: "visual" }));
}

export async function returnWorkFromActivity(formData: FormData) {
  "use server";
  const { actor, scope } = await activityActionContext(formData);
  try {
    await returnForCorrection(
      actor,
      String(formData.get("cmWorkId") ?? ""),
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    redirect(
      activityRedirect(scope, {
        activityView: "visual",
        storeError: activityActionError(error),
      }),
    );
  }
  redirect(activityRedirect(scope, { activityView: "visual" }));
}

function storeScopeFromActivity(scope: ActivityScope) {
  return {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    plantCode: scope.plant.code,
  };
}

async function activityActionContext(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const actor: Actor = {
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    id: user.id,
    plantId: scope.plant.id,
    role: user.role as Actor["role"],
    siteAdminPermissions: user.siteAdminPermissions,
  };
  return { actor, scope };
}

function optionalActivityText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function activityActionError(error: unknown) {
  if (!(error instanceof Error)) return "Please try again.";
  const expected = [
    "required",
    "invalid",
    "not found",
    "outside",
    "exceeds",
    "Not enough stock",
    "cannot be canceled",
    "cannot cancel",
    "Only Engineer",
    "must be",
    "greater than zero",
  ];
  return expected.some((text) => error.message.includes(text))
    ? error.message
    : "Please check the data and try again.";
}
