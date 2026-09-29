"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../../lib/session";
import {
  getUnreadSummary,
  markStatusGroupRead,
} from "../../modules/notifications/notification-service";
import type { NotificationGroup } from "../../modules/notifications/notification-types";
import { buildUserOperationalScope } from "../../modules/organization/user-plant-scope";

const dashboardNotificationGroups: NotificationGroup[] = [
  "ALL_CM",
  "NEW",
  "IN_PROCESS",
  "CLOSED",
  "CANCELED",
];

export async function markDashboardGroupReadAction(formData: FormData) {
  const user = await requireUser();
  const group = String(formData.get("group") ?? "") as NotificationGroup;
  const href = String(formData.get("href") ?? "/work");
  const scope = buildUserOperationalScope(user);

  if (dashboardNotificationGroups.includes(group)) {
    await markStatusGroupRead(user.id, group, scope);
  }

  redirect(href.startsWith("/work") ? href : "/work");
}

export type DashboardUnreadSummary = Awaited<
  ReturnType<typeof getUnreadSummary>
>;
