import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/session";
import { markAllNotificationsRead } from "../../../modules/notifications/notification-service";
import { buildUserOperationalScope } from "../../../modules/organization/user-plant-scope";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const scope = buildUserOperationalScope(user);
  await markAllNotificationsRead(user.id, scope);
  return NextResponse.redirect(new URL("/notifications", request.url), 303);
}
