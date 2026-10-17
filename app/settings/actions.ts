"use server";

import { requireUser } from "../../lib/session";
import { updateUserDisplayPreferences } from "../../modules/settings/display-preferences-service";

export async function saveDisplayPreferences(input: unknown, expectedOwner: string) {
  const user = await requireUser();
  if (expectedOwner !== user.id) return { ok: false as const, error: "บัญชีผู้ใช้เปลี่ยนแล้ว กรุณาโหลดหน้า Settings ใหม่ก่อนบันทึก" };
  try {
    const preferences = await updateUserDisplayPreferences(user.id, input);
    return { ok: true as const, preferences };
  } catch {
    return { ok: false as const, error: "บันทึกการตั้งค่าไม่สำเร็จ กรุณาลองใหม่" };
  }
}
