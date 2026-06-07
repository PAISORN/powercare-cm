import { db } from "../../lib/db";
import { verifyPassword } from "../../lib/password";

export async function authenticate(username: string, password: string) {
  const user = await db.user.findFirst({ where: { username, active: true } });
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}
