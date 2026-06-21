import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../lib/session";
import { markAllNotificationsRead } from "../../../modules/notifications/notification-service";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  await markAllNotificationsRead(user.id);
  return NextResponse.redirect(new URL("/notifications", request.url), 303);
}
