import { PackageSearch, Search } from "lucide-react";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { StoreIssueStatus } from "../../../modules/store/store-types";

export default async function PublicStoreTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string }>;
}) {
  const query = await searchParams;
  const number = query.number?.trim().toUpperCase() ?? "";
  const issue = number
    ? await db.sparePartIssue.findUnique({
        where: { number },
        select: {
          number: true,
          status: true,
          issueType: true,
          requestedAt: true,
          rejectReason: true,
          plant: { select: { name: true, organization: { select: { name: true } } } },
          items: {
            select: {
              id: true,
              lineNumber: true,
              requestedQty: true,
              approvedQty: true,
              issuedQty: true,
              sparePart: { select: { code: true, name: true, unit: true } },
            },
          },
        },
      })
    : null;

  return (
    <main className="min-h-screen bg-[var(--page)] px-4 py-8 text-[var(--ink)]">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="text-center">
          <PackageSearch className="mx-auto text-[var(--primary)]" size={44} />
          <h1 className="mt-3 text-3xl font-extrabold">ติดตามสถานะใบเบิก</h1>
          <p className="mt-2 text-[var(--muted)]">กรอกเลขที่ใบเบิก เช่น SI-RTB-2026-07-0001</p>
        </header>
        <form className="flex flex-col gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">เลขที่ใบเบิก</span>
            <input className={inputClass} defaultValue={number} name="number" placeholder="SI-XXX-YYYY-MM-0001" required />
          </label>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-bold text-white">
            <Search size={18} />
            ค้นหา
          </button>
        </form>

        {number && !issue ? (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-center font-bold text-amber-700">
            ไม่พบเลขที่ใบเบิกนี้
          </p>
        ) : null}

        {issue ? (
          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xl font-extrabold text-[var(--primary)]">{issue.number}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{issue.plant.organization.name} · {issue.plant.name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatThaiMediumDateTime(issue.requestedAt)}</p>
              </div>
              <span className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-extrabold">{statusLabel(issue.status)}</span>
            </div>
            <div className="mt-5 grid gap-3">
              {issue.items.map((item) => (
                <article className="grid gap-2 rounded-2xl bg-[var(--soft)] p-4 sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                  <div>
                    <p className="font-bold">{item.sparePart.code} · {item.sparePart.name}</p>
                    {item.lineNumber ? <p className="font-mono text-[11px] text-[var(--primary)]">{item.lineNumber}</p> : null}
                  </div>
                  <p className="font-bold">
                    จ่ายแล้ว {formatQty(Number(item.issuedQty ?? 0))} / {formatQty(Number(item.approvedQty ?? item.requestedQty))} {item.sparePart.unit}
                  </p>
                </article>
              ))}
            </div>
            {issue.rejectReason ? <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">หมายเหตุ: {issue.rejectReason}</p> : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รอ Engineer อนุมัติ",
    [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับแก้ไข",
    [StoreIssueStatus.ENGINEER_REJECTED]: "ไม่อนุมัติ",
    [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอ Store จ่าย",
    [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
    [StoreIssueStatus.ISSUED]: "จ่ายครบแล้ว",
    [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่พอ",
    [StoreIssueStatus.STORE_REJECTED]: "Store ปฏิเสธ",
    [StoreIssueStatus.CANCELED]: "ยกเลิก",
  };
  return labels[status] ?? status;
}

function formatQty(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 font-mono text-[var(--ink)] outline-none focus:border-[var(--primary)]";
