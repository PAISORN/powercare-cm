import { db } from "../../../../lib/db";

export const dynamic = "force-dynamic";

type CheckResult = { ok: true; count: number } | { ok: false; name: string; code: string | null };

function databaseTarget() {
  const value = process.env.DATABASE_URL;
  if (!value) return { configured: false, host: null };

  try {
    return { configured: true, host: new URL(value).hostname };
  } catch {
    return { configured: true, host: "invalid-url" };
  }
}

async function checkCount(query: () => Promise<number>): Promise<CheckResult> {
  try {
    return { ok: true, count: await query() };
  } catch (error) {
    const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
    return {
      ok: false,
      name: typeof record.name === "string" ? record.name : "UnknownError",
      code: typeof record.code === "string" ? record.code : null,
    };
  }
}

export async function GET() {
  const [categories, works, systemSettings, announcements] = await Promise.all([
    checkCount(() => db.category.count()),
    checkCount(() => db.cmWork.count()),
    checkCount(() => db.systemSetting.count()),
    checkCount(() => db.announcement.count()),
  ]);

  return Response.json({
    database: databaseTarget(),
    checks: { categories, works, systemSettings, announcements },
  });
}
