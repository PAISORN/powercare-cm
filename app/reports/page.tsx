import { AppShell } from "../../components/app-shell";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import { RoleName } from "../../modules/cm-work/cm-work-types";

export default async function ReportsPage() {
  const user = await requireUser();
  const canExport = user.role === RoleName.ADMIN || user.role === RoleName.ENGINEER;
  const works = canExport
    ? await db.cmWork.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { category: true, zone: true, claimant: true } })
    : [];

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Report Export</h1>
      {!canExport ? <p className="mt-4 text-[var(--muted)]">Role นี้ยังไม่มีสิทธิ์ Export Excel ในรอบแรก</p> : null}
      {canExport ? (
        <div className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <p>รายการที่พร้อม export: {works.length}</p>
          <a className="mt-4 inline-flex rounded-md bg-[var(--primary)] px-4 py-2 text-white" href="/reports/export">
            Export Excel
          </a>
        </div>
      ) : null}
    </AppShell>
  );
}
