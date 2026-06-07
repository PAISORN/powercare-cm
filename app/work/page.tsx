import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { StatusBadge } from "../../components/status-badge";
import { db } from "../../lib/db";

export default async function WorkListPage() {
  const works = await db.cmWork.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, zone: true, claimant: true },
  });

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">รายการงานทั้งหมด</h1>
      <div className="mt-6 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
        {works.map((work) => (
          <Link key={work.id} className="grid gap-2 border-b border-[var(--line)] p-4 md:grid-cols-[1fr_auto]" href={`/work/${work.id}`}>
            <span>
              {work.number} · {work.machineName} · {work.category.name} · {work.zone.name} · ผู้รับงาน: {work.claimant?.fullName ?? "-"}
            </span>
            <StatusBadge status={work.status} />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
