import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { WorkStatus } from "../../modules/cm-work/cm-work-types";
import { StoreIssueStatus } from "../../modules/store/store-types";
export function WorkMetaItem({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-start gap-3 border-[var(--line)] px-4 py-4 sm:px-5 ${wide ? "sm:col-span-2 xl:col-span-2" : ""}`}>
      <Icon aria-hidden="true" className="shrink-0 text-[var(--primary)]" size={22} />
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
        <p className={`mt-1 font-semibold leading-relaxed text-[var(--ink)] ${wide ? "line-clamp-2" : "truncate"}`}>{value || "-"}</p>
      </div>
    </div>
  );
}
export function ReviewDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-[var(--soft)] p-4">
      <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-2 whitespace-pre-wrap font-semibold">{value?.trim() || "-"}</p>
    </div>
  );
}

export function technicianCompletionTimelineNote(
  status: string,
  work: { rootCause: string | null; correctiveAction: string | null; workNote: string | null },
) {
  if (status !== WorkStatus.WAITING_TO_CLOSE) return null;
  const details = [
    work.rootCause?.trim() ? `สาเหตุ: ${work.rootCause.trim()}` : null,
    work.correctiveAction?.trim() ? `วิธีการแก้ไข: ${work.correctiveAction.trim()}` : null,
    work.workNote?.trim() ? `หมายเหตุช่าง: ${work.workNote.trim()}` : null,
  ].filter(Boolean);
  return details.length ? details.join("\n") : null;
}

export function WorkStatusTimelineRow({
  active,
  actor,
  note,
  time,
  title,
}: {
  active: boolean;
  actor: string;
  note?: string | null;
  time: Date;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <div className="grid justify-center">
        <span className={active ? "mt-1 h-4 w-4 rounded-full bg-emerald-500" : "mt-1 h-4 w-4 rounded-full border-2 border-emerald-500 bg-[var(--surface)]"} />
        <span className="mx-auto h-full min-h-10 w-0.5 bg-emerald-500/45" />
      </div>
      <div className="pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{title}</strong>
          <span className="text-sm text-[var(--muted)]">{formatThaiDateTime(time)}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">โดย {actor}</p>
        {note ? <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{note}</p> : null}
      </div>
    </div>
  );
}

type StoreIssueForWork = {
  id: string;
  number: string;
  status: string;
  requestedAt: Date;
  requesterUserId: string | null;
  items: Array<{
    id: string;
    requestedQty: unknown;
    approvedQty: unknown;
    issuedQty: unknown;
    store: { code: string; name: string } | null;
    sparePart: { code: string; name: string; unit: string };
  }>;
};

export function StoreIssuePanel({
  cancelOwnPendingStoreIssueAction,
  currentUserId,
  storeIssues,
}: {
  cancelOwnPendingStoreIssueAction: (formData: FormData) => Promise<void>;
  currentUserId: string;
  storeIssues: StoreIssueForWork[];
}) {
  if (!storeIssues.length) return null;
  return (
    <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--primary)]">Store / Spare Parts</p>
          <h2 className="mt-1 text-xl font-bold">ใบเบิกอะไหล่ที่ผูกกับงานนี้</h2>
        </div>
        <Link className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-bold text-[var(--primary)]" href="/dashboardstore/tracking">
          ติดตามทั้งหมด
        </Link>
      </div>
      <div className="mt-4 grid gap-3">
        {storeIssues.map((issue) => (
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4" key={issue.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-extrabold">{issue.number}</p>
                <p className="text-sm text-[var(--muted)]">{formatThaiDateTime(issue.requestedAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StoreIssueStatusBadge status={issue.status} />
                {issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL && issue.requesterUserId === currentUserId ? (
                  <form action={cancelOwnPendingStoreIssueAction}>
                    <input type="hidden" name="issueId" value={issue.id} />
                    <button className="rounded-full border border-red-300 px-3 py-1 text-xs font-extrabold text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10">
                      ยกเลิกใบเบิก
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {issue.items.map((item) => (
                <div className="grid gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={item.id}>
                  <p className="truncate font-bold">
                    {item.sparePart.code} · {item.sparePart.name}
                    <span className="ml-2 font-normal text-[var(--muted)]">{item.store?.code ?? "-"}</span>
                  </p>
                  <p className="font-bold">
                    จ่ายแล้ว {formatQty(Number(item.issuedQty ?? 0))} / {formatQty(Number(item.approvedQty ?? item.requestedQty))} {item.sparePart.unit}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StoreIssueStatusBadge({ status }: { status: string }) {
  const labelMap: Record<string, string> = {
    [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รอ Engineer อนุมัติ",
    [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับให้แก้ไข",
    [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอ Store จ่ายของ",
    [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
    [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่พอ",
    [StoreIssueStatus.ISSUED]: "จ่ายแล้ว",
    [StoreIssueStatus.ENGINEER_REJECTED]: "Engineer ไม่อนุมัติ",
    [StoreIssueStatus.STORE_REJECTED]: "Store ไม่อนุมัติ",
    [StoreIssueStatus.CANCELED]: "ยกเลิก",
  };
  const isDone = status === StoreIssueStatus.ISSUED;
  const badStatuses = [
    StoreIssueStatus.NOT_ENOUGH_STOCK,
    StoreIssueStatus.ENGINEER_REJECTED,
    StoreIssueStatus.STORE_REJECTED,
    StoreIssueStatus.CANCELED,
  ] as string[];
  const isBad = badStatuses.includes(status);
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
        isDone
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : isBad
            ? "bg-red-500/15 text-red-700 dark:text-red-300"
            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      }`}
    >
      {labelMap[status] ?? status}
    </span>
  );
}

function formatQty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}
