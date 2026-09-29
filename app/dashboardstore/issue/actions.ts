"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import {
  issueHrefWithFeedback,
  safeIssueReturnTo,
} from "../../../modules/store/issue-action-return";
import { storeIssueActionError } from "../../../modules/store/store-issue-action-error";
import { parseStoreIssueFormData } from "../../../modules/store/store-issue-form-data";
import {
  approveStoreIssue,
  cancelStoreIssue,
  createLoggedInStoreIssue,
  issueStoreStock,
  markIssueNotEnoughStock,
} from "../../../modules/store/store-issue-prisma";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";

const storeActionFallback = "ไม่สามารถดำเนินการได้ โปรดตรวจสอบข้อมูลและลองใหม่";

export async function createIssueAction(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const issueInput = parseStoreIssueFormData(formData);

  let createdNumber: string | null = null;
  let actionError: string | null = null;
  try {
    const created = await createLoggedInStoreIssue(
      user,
      storeScope(scope),
      {
        ...issueInput,
        requesterName: user.fullName,
        requestedAt: new Date(),
      },
    );
    createdNumber = created.number;
  } catch (error) {
    actionError = storeIssueActionError(error, storeActionFallback);
  }

  redirect(
    issueCreateHref(
      scope,
      createdNumber
        ? { created: createdNumber }
        : { error: actionError ?? "Unknown error" },
    ),
  );
}

export async function engineerDecisionAction(formData: FormData) {
  return runTrackingAction(formData, "decision", ({ scope, user }) =>
    approveStoreIssue(
      user,
      storeScope(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("decision") ?? "") as "APPROVE" | "REJECT" | "RETURN",
      optionalText(formData.get("reason")),
    ),
  );
}

export async function issueStockAction(formData: FormData) {
  return runTrackingAction(formData, "issued", ({ scope, user }) =>
    issueStoreStock(
      user,
      storeScope(scope),
      String(formData.get("issueId") ?? ""),
    ),
  );
}

export async function notEnoughStockAction(formData: FormData) {
  return runTrackingAction(formData, "not-enough", ({ scope, user }) =>
    markIssueNotEnoughStock(
      user,
      storeScope(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("reason") ?? ""),
    ),
  );
}

export async function cancelIssueAction(formData: FormData) {
  return runTrackingAction(formData, "canceled", ({ scope, user }) =>
    cancelStoreIssue(
      user,
      storeScope(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("reason") ?? ""),
    ),
  );
}

async function runTrackingAction(
  formData: FormData,
  successValue: string,
  operation: (context: TrackingActionContext) => Promise<unknown>,
): Promise<never> {
  const context = await actionContext(formData);
  let actionError: string | null = null;
  try {
    await operation(context);
  } catch (error) {
    actionError = storeIssueActionError(error, storeActionFallback);
  }
  redirect(
    issueHrefWithFeedback(
      context.returnTo,
      actionError ? "error" : "saved",
      actionError ?? successValue,
    ),
  );
}

async function actionContext(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const returnTo = safeIssueReturnTo(
    {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
    },
    formData.get("returnTo"),
  );
  return { returnTo, scope, user };
}

type StoreScope = Awaited<ReturnType<typeof resolveStorePageScope>>;
type TrackingActionContext = Awaited<ReturnType<typeof actionContext>>;

function storeScope(scope: StoreScope) {
  return {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    plantCode: scope.plant.code,
  };
}

function issueCreateHref(scope: StoreScope, result: Record<string, string>) {
  const params = new URLSearchParams({
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    ...result,
  });
  return `/dashboardstore/issue?${params}`;
}

function optionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
