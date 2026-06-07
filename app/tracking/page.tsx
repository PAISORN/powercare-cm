import { PublicHeader } from "../../components/public-header";
import { StatusBadge } from "../../components/status-badge";
import { db } from "../../lib/db";
import { urgencyLabels, type Urgency } from "../../modules/cm-work/cm-work-types";

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ number?: string }> }) {
  const { number: rawNumber } = await searchParams;
  const number = rawNumber?.trim();
  const work = number ? await db.cmWork.findUnique({ where: { number }, include: { category: true, zone: true } }) : null;

  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-3xl px-8 py-10">
        <h1 className="text-3xl font-bold">ติดตามสถานะ</h1>
        <form className="mt-6 flex flex-wrap gap-3">
          <input name="number" defaultValue={number} placeholder="CM-2026-06-0001" className="flex-1 rounded-md border p-3 text-black" />
          <button className="rounded-md bg-[var(--primary)] px-5 py-3 text-white">ค้นหา</button>
        </form>
        {number && !work ? <p className="mt-6 text-[var(--muted)]">ไม่พบเลขที่แจ้งซ่อมนี้</p> : null}
        {work ? (
          <div className="mt-6 grid gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
            <p>
              <strong>เลขที่แจ้งซ่อม:</strong> {work.number}
            </p>
            <p className="flex items-center gap-2">
              <strong>สถานะ:</strong> <StatusBadge status={work.status} />
            </p>
            <p>
              <strong>Category:</strong> {work.category.name}
            </p>
            <p>
              <strong>Zone:</strong> {work.zone.name}
            </p>
            <p>
              <strong>ชื่อเครื่องจักร:</strong> {work.machineName}
            </p>
            <p>
              <strong>ความเร่งด่วน:</strong> {urgencyLabels[work.urgency as Urgency]}
            </p>
            <p>
              <strong>วันที่แจ้ง:</strong> {work.createdAt.toLocaleString("th-TH")}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
