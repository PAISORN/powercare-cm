import { Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { requireUser } from "../../../lib/session";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import {
  readEngineerAssignmentSetting,
  updateEngineerAssignmentSetting,
} from "../../../modules/settings/system-settings-service";

async function updateAssignmentSetting(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");

  try {
    await updateEngineerAssignmentSetting(
      { id: user.id, role: RoleName.ADMIN, categoryId: user.categoryId },
      formData.get("engineerWorkAssignmentEnabled") === "on",
    );
  } catch {
    redirect("/admin/settings?error=1");
  }
  redirect("/admin/settings?saved=1");
}

export default async function AdminSystemSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");

  const [enabled, query] = await Promise.all([readEngineerAssignmentSetting(), searchParams]);

  return (
    <AppShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
            <SlidersHorizontal aria-hidden="true" size={17} />
            Admin Control
          </p>
          <h1 className="mt-2 text-3xl font-extrabold">System Settings</h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            กำหนดสิทธิ์ส่วนกลางสำหรับขั้นตอนการทำงานของระบบ CM
          </p>
        </div>
      </header>

      {query.saved === "1" ? (
        <p className="mt-5 rounded-lg border border-green-500/35 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">
          บันทึกการตั้งค่าเรียบร้อยแล้ว
        </p>
      ) : null}
      {query.error === "1" ? (
        <p className="mt-5 rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">
          บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
        </p>
      ) : null}

      <section className="mt-6 max-w-3xl rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--soft)] text-[var(--primary)]">
            <ShieldCheck aria-hidden="true" size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold">Engineer Work Assignment</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              เมื่อเปิด Engineer จะมอบหมายงานให้ช่างที่อยู่ Category เดียวกันได้ Admin ยังคงมอบหมายงานได้เสมอ
            </p>
          </div>
        </div>

        <form action={updateAssignmentSetting} className="mt-6 grid gap-5">
          <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-lg border border-[var(--line)] bg-[var(--soft)] px-4 py-3">
            <span>
              <strong className="block">อนุญาตให้ Engineer มอบหมายงาน</strong>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                {enabled ? "เปิดใช้งานอยู่" : "ปิดใช้งานอยู่"}
              </span>
            </span>
            <span className="relative inline-flex h-8 w-14 shrink-0 items-center">
              <input
                className="peer sr-only"
                defaultChecked={enabled}
                name="engineerWorkAssignmentEnabled"
                type="checkbox"
              />
              <span className="absolute inset-0 rounded-full bg-gray-400 transition peer-checked:bg-[var(--primary)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--primary)]" />
              <span className="relative ml-1 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-6" />
            </span>
          </label>

          <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]" type="submit">
            <Save aria-hidden="true" size={18} />
            บันทึกการตั้งค่า
          </button>
        </form>
      </section>
    </AppShell>
  );
}
