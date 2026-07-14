import { Clock, Save } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields, AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData, resolveAdminSiteScope } from "../../../modules/admin/admin-site-scope";
import { canManageSlaDueDate } from "../../../modules/auth/permission";

async function updateSla(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageSlaDueDate(user)) redirect("/dashboard");
  const scope = await resolveAdminSiteScope(user, adminScopeSearchFromFormData(formData));
  const data = {
    claimDays: Math.max(1, Number(formData.get("claimDays")) || 1),
    executionDays: Math.max(1, Number(formData.get("executionDays")) || 1),
    reviewDays: Math.max(1, Number(formData.get("reviewDays")) || 1),
  };

  const before = await db.slaSetting.findUnique({ where: { plantId: scope.plant.id } });
  const updated = before
    ? await db.slaSetting.update({ where: { id: before.id }, data })
    : await db.slaSetting.create({ data: { ...data, plantId: scope.plant.id } });

  await db.auditEvent.create({
    data: {
      actorId: user.id,
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      entityType: "SlaSetting",
      entityId: updated.id,
      action: "UPDATE_SLA_SETTING",
      beforeJson: before ? JSON.stringify(before) : null,
      afterJson: JSON.stringify(updated),
    },
  });

  redirect(`/admin/sla?saved=1&organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`);
}

export default async function AdminSlaPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; organizationId?: string; plantId?: string }>;
}) {
  const user = await requireUser();
  if (!canManageSlaDueDate(user)) redirect("/dashboard");
  const query = await searchParams;
  const scope = await resolveAdminSiteScope(user, query);
  const sla =
    (await db.slaSetting.findUnique({ where: { plantId: scope.plant.id } })) ??
    (await db.slaSetting.findFirst({ where: { plantId: null }, orderBy: { updatedAt: "desc" } })) ??
    { claimDays: 1, executionDays: 3, reviewDays: 2 };

  return (
    <AppShell>
      <header>
        <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-bold text-[var(--primary)]">
          <Clock aria-hidden="true" size={17} />
          Admin Settings
        </p>
        <h1 className="mt-3 text-3xl font-extrabold">SLA Settings</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          กำหนดจำนวนวันแจ้งเตือนงานค้างตาม Site เพื่อให้แต่ละหน่วยงานมี SLA ที่เหมาะกับงานของตัวเอง
        </p>
      </header>

      <div className="mt-5">
        <AdminSiteScopeSelector action="/admin/sla" scope={scope} />
      </div>

      {query.saved === "1" ? (
        <p className="mt-5 rounded-lg border border-green-500/35 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300">
          บันทึก SLA เรียบร้อยแล้ว
        </p>
      ) : null}

      <form action={updateSla} className="mt-6 grid max-w-3xl gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:grid-cols-3">
        <AdminScopeHiddenFields scope={scope} />
        <label className="grid gap-2 text-sm font-semibold">
          ค้างรับงาน
          <input className="rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3 text-[var(--ink)]" min={1} name="claimDays" type="number" defaultValue={sla.claimDays} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          ค้างดำเนินการ
          <input className="rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3 text-[var(--ink)]" min={1} name="executionDays" type="number" defaultValue={sla.executionDays} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          ค้างตรวจปิด
          <input className="rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3 text-[var(--ink)]" min={1} name="reviewDays" type="number" defaultValue={sla.reviewDays} />
        </label>
        <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)] sm:col-span-3" type="submit">
          <Save aria-hidden="true" size={18} />
          บันทึก SLA
        </button>
      </form>
    </AppShell>
  );
}
