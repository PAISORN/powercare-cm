import { db } from "../../lib/db";
import { cache } from "react";
import { backgroundPreferences, languagePreferences, parseDisplayPreferences, themePreferences, MIN_BACKGROUND_BLUR, MAX_BACKGROUND_BLUR, MIN_BACKGROUND_BRIGHTNESS, MAX_BACKGROUND_BRIGHTNESS, type DisplayPreferences } from "./user-preferences";

export const getUserDisplayPreferences = cache(async function getUserDisplayPreferences(userId: string): Promise<DisplayPreferences> {
  // Parameterized SQL supports local clients whose Windows engine is still in use
  // during generation. Both Prisma schemas declare this nullable column.
  const rows = await db.$queryRaw<Array<{ displayPreferences: string | null }>>`SELECT "displayPreferences" FROM "User" WHERE "id" = ${userId} AND "active" = true`;
  return parseDisplayPreferences(rows[0]?.displayPreferences);
});

export async function updateUserDisplayPreferences(userId: string, patch: unknown): Promise<DisplayPreferences> {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) throw new Error("ข้อมูลการตั้งค่าไม่ถูกต้อง");
  const input = patch as Record<string, unknown>;
  const keys = ["theme", "background", "backgroundBlur", "backgroundBrightness", "language"];
  if (Object.keys(input).some(key => !keys.includes(key))) throw new Error("ข้อมูลการตั้งค่าไม่ถูกต้อง");
  if (input.theme !== undefined && !themePreferences.includes(input.theme as never)) throw new Error("ธีมไม่ถูกต้อง");
  if (input.background !== undefined && !backgroundPreferences.includes(input.background as never)) throw new Error("พื้นหลังไม่ถูกต้อง");
  if (input.language !== undefined && !languagePreferences.includes(input.language as never)) throw new Error("ภาษาไม่ถูกต้อง");
  for (const [key, min, max] of [["backgroundBlur", MIN_BACKGROUND_BLUR, MAX_BACKGROUND_BLUR], ["backgroundBrightness", MIN_BACKGROUND_BRIGHTNESS, MAX_BACKGROUND_BRIGHTNESS]] as const) {
    if (input[key] !== undefined && (typeof input[key] !== "number" || !Number.isInteger(input[key]) || input[key] < min || input[key] > max)) throw new Error("ค่าปรับภาพไม่ถูกต้อง");
  }
  return db.$transaction(async transaction => {
    const rows = await transaction.$queryRaw<Array<{ displayPreferences: string | null }>>`SELECT "displayPreferences" FROM "User" WHERE "id" = ${userId} AND "active" = true`;
    if (!rows.length) throw new Error("ไม่พบบัญชีผู้ใช้");
    const next = { ...parseDisplayPreferences(rows[0].displayPreferences), ...input } as DisplayPreferences;
    const serialized = JSON.stringify(next);
    await transaction.$executeRaw`UPDATE "User" SET "displayPreferences" = ${serialized} WHERE "id" = ${userId} AND "active" = true`;
    return next;
  }, { isolationLevel: "Serializable" });
}
