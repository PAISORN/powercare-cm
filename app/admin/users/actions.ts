"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cacheTags, revalidateCmData } from "../../../lib/query-cache";
import { requireUser } from "../../../lib/session";
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUserMutationIssue,
  updateManagedUser,
  type ManagedUserMutationIssue,
} from "../../../modules/users/managed-user-mutation";
import {
  parseCreateManagedUserInput,
  parseDeleteManagedUserInput,
  parseUpdateManagedUserInput,
} from "../../../modules/users/managed-user-mutation-input";

export async function createUser(formData: FormData) {
  "use server";
  const current = await requireUser();
  try {
    await createManagedUser(current, parseCreateManagedUserInput(formData));
  } catch (error) {
    const issue = getManagedUserMutationIssue(error);
    if (!issue) throw error;
    redirect(adminUsersCreateFailureHref(issue));
  }
  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUserProfile(formData: FormData) {
  "use server";
  const current = await requireUser();
  const requestedReturnTo = String(formData.get("returnTo") ?? "");
  const returnTo = requestedReturnTo === "/admin/users" || requestedReturnTo.startsWith("/admin/users?")
    ? requestedReturnTo
    : "/admin/users";
  let userId = "";
  try {
    ({ userId } = await updateManagedUser(
      current,
      parseUpdateManagedUserInput(formData),
    ));
  } catch (error) {
    const issue = getManagedUserMutationIssue(error);
    if (!issue) throw error;
    redirect(adminUsersUpdateFailureHref(issue));
  }
  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  revalidatePath("/admin/users");
  redirect(`${returnTo}#user-${encodeURIComponent(userId)}`);
}

export async function deleteUser(formData: FormData) {
  "use server";
  const current = await requireUser();
  try {
    await deleteManagedUser(current, parseDeleteManagedUserInput(formData));
  } catch (error) {
    const issue = getManagedUserMutationIssue(error);
    if (!issue) throw error;
    if (issue === "invalid-password") {
      redirect("/admin/users?deleteStatus=error");
    }
    redirect("/admin/users");
  }
  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  revalidatePath("/admin/users");
  redirect("/admin/users?deleteStatus=success");
}

function adminUsersCreateFailureHref(issue: ManagedUserMutationIssue) {
  const status = issue === "organization-required" ? "orgRequired"
    : issue === "inventory-scope-required" ? "inventoryScopeRequired"
      : issue === "approval-scope-required" ? "approvalScopeRequired"
        : issue === "duplicate-username" ? "duplicate"
          : issue === "quota" ? "quota" : null;
  return status ? `/admin/users?createStatus=${status}` : "/admin/users";
}

function adminUsersUpdateFailureHref(issue: ManagedUserMutationIssue) {
  const status = issue === "inventory-scope-required" ? "inventoryScopeRequired"
    : issue === "approval-scope-required" ? "approvalScopeRequired"
      : issue === "duplicate-username" ? "duplicate" : null;
  return status ? `/admin/users?updateStatus=${status}` : "/admin/users";
}
