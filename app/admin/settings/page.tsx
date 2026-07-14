import { Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields, AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { requireUser } from "../../../lib/session";
import { db } from "../../../lib/db";
import { adminScopeSearchFromFormData, resolveAdminSiteScope } from "../../../modules/admin/admin-site-scope";
import { canManageEngineerAssignmentSetting } from "../../../modules/auth/permission";
import { RoleName, type Actor } from "../../../modules/cm-work/cm-work-types";
import {
  readEngineerAssignmentSetting,
  updateEngineerAssignmentSetting,
} from "../../../modules/settings/system-settings-service";

async function updateAssignmentSetting(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageEngineerAssignmentSetting(user)) redirect("/dashboard");
  const scope = await resolveAdminSiteScope(user, adminScopeSearchFromFormData(formData));

  try {
    await updateEngineerAssignmentSetting(
      {
        id: user.id,
        role: user.role as Actor["role"],
        categoryId: user.categoryId,
        plantId: user.plantId,
        siteAdminPermissions: user.siteAdminPermissions,
      },
      formData.get("engineerWorkAssignmentEnabled") === "on",
      undefined,
      scope.plant.id,
      scope.organization.id,
    );
  } catch {
    redirect(`/admin/settings?error=1&organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`);
  }
  redirect(`/admin/settings?saved=1&organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`);
}

async function updatePublicStoreSetting(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const scope = await resolveAdminSiteScope(user, adminScopeSearchFromFormData(formData));
  const publicStoreIssueEnabled = formData.get("publicStoreIssueEnabled") === "on";
  const publicStoreIssueContactRequired = formData.get("publicStoreIssueContactRequired") === "on";
  await db.$transaction(async (tx) => {
    const before = await tx.plant.findUniqueOrThrow({
      where: { id: scope.plant.id },
      select: { publicStoreIssueEnabled: true, publicStoreIssueContactRequired: true },
    });
    await tx.plant.update({
      where: { id: scope.plant.id },
      data: { publicStoreIssueEnabled, publicStoreIssueContactRequired },
    });
    await tx.auditEvent.create({
      data: {
        actorId: user.id,
        organizationId: scope.organization.id,
        plantId: scope.plant.id,
        entityType: "Plant",
        entityId: scope.plant.id,
        action: "UPDATE_PUBLIC_STORE_ISSUE_SETTING",
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify({ publicStoreIssueEnabled, publicStoreIssueContactRequired }),
      },
    });
  });
  redirect(`/admin/settings?saved=store&organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`);
}

export default async function AdminSystemSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; organizationId?: string; plantId?: string }>;
}) {
  const user = await requireUser();
  if (!canManageEngineerAssignmentSetting(user)) redirect("/dashboard");

  const query = await searchParams;
  const scope = await resolveAdminSiteScope(user, query);
  const [enabled, publicStoreSetting] = await Promise.all([
    readEngineerAssignmentSetting(scope.plant.id),
    db.plant.findUniqueOrThrow({
      where: { id: scope.plant.id },
      select: { publicStoreIssueEnabled: true, publicStoreIssueContactRequired: true, inventoryCode: true },
    }),
  ]);

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
            เลือก Organization และ Site ก่อนตั้งค่าสิทธิ์การมอบหมายงาน เพื่อให้แต่ละ Site ทำงานแยกกันชัดเจน
          </p>
        </div>
      </header>

      <div className="mt-5">
        <AdminSiteScopeSelector action="/admin/settings" scope={scope} />
      </div>

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
              เมื่อเปิด Engineer จะมอบหมายงานให้ช่างใน Site และ Category ที่เกี่ยวข้องได้
            </p>
          </div>
        </div>

        <form action={updateAssignmentSetting} className="mt-6 grid gap-5">
          <AdminScopeHiddenFields scope={scope} />
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

      {user.role === RoleName.ADMIN ? (
        <section className="mt-6 max-w-3xl rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--soft)] text-[var(--primary)]">
              <ShieldCheck aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold">Public Store Issue</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Owner Admin เปิดการเบิกอะไหล่ผ่าน QR แยกราย Site ได้ โดยลิงก์ใช้ Store Site Code 3 ตัว
              </p>
            </div>
          </div>
          <form action={updatePublicStoreSetting} className="mt-6 grid gap-4">
            <AdminScopeHiddenFields scope={scope} />
            {!publicStoreSetting.inventoryCode ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700">
                กรุณาตั้ง Store Site Code ที่หน้า Spare Parts ก่อนเปิด Public Store Issue
              </p>
            ) : (
              <p className="rounded-xl bg-[var(--soft)] px-4 py-3 text-sm font-bold">
                Public link: /p/{publicStoreSetting.inventoryCode.toLowerCase()}/store/issue
              </p>
            )}
            <SettingToggle
              checked={publicStoreSetting.publicStoreIssueEnabled}
              description="อนุญาตให้ผู้ไม่มีบัญชีส่งใบขอเบิกผ่าน QR ของ Site นี้"
              label="เปิด Public Store Issue"
              name="publicStoreIssueEnabled"
            />
            <SettingToggle
              checked={publicStoreSetting.publicStoreIssueContactRequired}
              description="บังคับให้ผู้ขอกรอกเบอร์ติดต่อหรือช่องทางติดต่อ"
              label="บังคับกรอกช่องทางติดต่อ"
              name="publicStoreIssueContactRequired"
            />
            <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]" disabled={!publicStoreSetting.inventoryCode}>
              <Save aria-hidden="true" size={18} />
              บันทึก Public Store
            </button>
          </form>
        </section>
      ) : null}
    </AppShell>
  );
}

function SettingToggle({
  name,
  label,
  description,
  checked,
}: {
  name: string;
  label: string;
  description: string;
  checked: boolean;
}) {
  return (
    <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-lg border border-[var(--line)] bg-[var(--soft)] px-4 py-3">
      <span>
        <strong className="block">{label}</strong>
        <span className="mt-1 block text-sm text-[var(--muted)]">{description}</span>
      </span>
      <input className="size-5 accent-[var(--primary)]" defaultChecked={checked} name={name} type="checkbox" />
    </label>
  );
}
