import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

const sessionCookie = "cm_session_user";
const lastSeenTouchIntervalMs = 2 * 60 * 1000;
const lastSeenSelect = { lastSeenAt: true } as const;

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  await db.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  cookieStore.set(sessionCookie, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookie);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(sessionCookie)?.value;
  if (!userId) return null;
  const user = await db.user.findFirst({
    where: { id: userId, active: true },
    include: { category: true, categories: true, plant: true, signature: true, profilePhoto: true, siteAdminPermissions: true },
  });
  if (!user) return null;
  if (shouldTouchLastSeen(user.lastSeenAt)) {
    await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() }, select: lastSeenSelect });
  }
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

function shouldTouchLastSeen(lastSeenAt?: Date | null) {
  if (!lastSeenAt) return true;
  return Date.now() - lastSeenAt.getTime() > lastSeenTouchIntervalMs;
}
