import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { StatusBadge } from "../../components/status-badge";
import { getDashboardSummary } from "../../modules/dashboard/dashboard-query";
import { statusLabels, urgencyLabels, type Urgency, type WorkStatus } from "../../modules/cm-work/cm-work-types";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="text-[var(--muted)]">งานทั้งหมด</p>
          <strong className="text-4xl">{summary.total}</strong>
        </div>
        {summary.byStatus.slice(0, 3).map((item) => (
          <div key={item.status} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
            <p className="text-[var(--muted)]">{statusLabels[item.status as WorkStatus] ?? item.status}</p>
            <strong className="text-4xl">{item.count}</strong>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-xl font-semibold">ตาม Category</h2>
          <div className="mt-4 grid gap-2">
            {summary.byCategory.map((item) => (
              <div key={item.categoryName} className="flex justify-between rounded-md border border-[var(--line)] p-3">
                <span>{item.categoryName}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-xl font-semibold">ตามความเร่งด่วน</h2>
          <div className="mt-4 grid gap-2">
            {summary.byUrgency.map((item) => (
              <div key={item.urgency} className="flex justify-between rounded-md border border-[var(--line)] p-3">
                <span>{urgencyLabels[item.urgency as Urgency] ?? item.urgency}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold">รายการล่าสุด</h2>
        <div className="mt-4 grid gap-3">
          {summary.latest.map((work) => (
            <Link key={work.id} className="grid grid-cols-[1fr_auto] rounded-md border border-[var(--line)] p-3" href={`/work/${work.id}`}>
              <span>
                {work.number} · {work.machineName} · {work.zone.name}
              </span>
              <StatusBadge status={work.status} />
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
