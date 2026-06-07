import Link from "next/link";
import { PublicHeader } from "../components/public-header";
import { StatusBadge } from "../components/status-badge";
import { db } from "../lib/db";
import { WorkStatus } from "../modules/cm-work/cm-work-types";

async function getPublicSummary() {
  const [total, open, closed, latest] = await Promise.all([
    db.cmWork.count(),
    db.cmWork.count({ where: { status: { notIn: [WorkStatus.CLOSED, WorkStatus.CANCELED] } } }),
    db.cmWork.count({ where: { status: WorkStatus.CLOSED } }),
    db.cmWork.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { category: true, zone: true },
    }),
  ]);

  return { total, open, closed, latest };
}

export default async function LandingPage() {
  const summary = await getPublicSummary();

  return (
    <main>
      <PublicHeader />
      <section className="grid gap-8 px-8 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--muted)]">
            งานไฟฟ้า · งานเครื่องกล · 10 Plant Zones
          </p>
          <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-6xl">Corrective Maintenance Control Center</h1>
          <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">ระบบแจ้งซ่อมและติดตามงาน Corrective Maintenance สำหรับโรงไฟฟ้า</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="rounded-md bg-[var(--primary)] px-5 py-3 text-white" href="/request">
              แจ้งซ่อมทันที
            </Link>
            <Link className="rounded-md border border-[var(--line)] px-5 py-3" href="/tracking">
              ติดตามสถานะ
            </Link>
          </div>
        </div>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-semibold">Public CM Dashboard</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-[var(--line)] p-4">
              <p className="text-sm text-[var(--muted)]">งานทั้งหมด</p>
              <strong className="text-3xl">{summary.total}</strong>
            </div>
            <div className="rounded-md border border-[var(--line)] p-4">
              <p className="text-sm text-[var(--muted)]">งานเปิดอยู่</p>
              <strong className="text-3xl">{summary.open}</strong>
            </div>
            <div className="rounded-md border border-[var(--line)] p-4">
              <p className="text-sm text-[var(--muted)]">ปิดงานแล้ว</p>
              <strong className="text-3xl">{summary.closed}</strong>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {summary.latest.map((work) => (
              <div key={work.id} className="grid gap-2 rounded-md border border-[var(--line)] p-3 md:grid-cols-[1fr_auto]">
                <span>
                  {work.number} · {work.category.name} · {work.zone.name} · {work.machineName}
                </span>
                <StatusBadge status={work.status} />
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
