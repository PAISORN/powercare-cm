import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

const sessionCookie = "cm_session_user";

export async function setSession(userId: string) {
  const cookieStore = await cookies();
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
  return db.user.findFirst({
    where: { id: userId, active: true },
    include: { category: true, signature: true, profilePhoto: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
