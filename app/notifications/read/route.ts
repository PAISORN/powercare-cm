import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/session";
import { markNotificationRead } from "../../../modules/notifications/notification-service";
import { buildUserOperationalScope } from "../../../modules/organization/user-plant-scope";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);

  const formData = await request.formData();
  const notificationId = String(formData.get("notificationId") ?? "");
  const scope = buildUserOperationalScope(user);
  const notification = await db.userNotification.findFirst({ where: { id: notificationId, recipientId: user.id } });
  if (!notification) return NextResponse.redirect(new URL("/notifications?targetUnavailable=1", request.url), 303);

  const result = await markNotificationRead(user.id, notification.id, scope);
  if (result.count === 0) return NextResponse.redirect(new URL("/notifications?targetUnavailable=1", request.url), 303);
  const destination = notification.href?.startsWith("/work/") ? notification.href : "/notifications";
  return NextResponse.redirect(new URL(destination, request.url), 303);
}
