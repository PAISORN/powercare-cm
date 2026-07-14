import { WorkStatus, statusLabels, type WorkStatus as WorkStatusValue } from "../modules/cm-work/cm-work-types";

const colorByStatus: Record<WorkStatusValue, string> = {
  NEW: "bg-amber-100 text-amber-800",
  WAITING_TO_CLAIM: "bg-orange-100 text-orange-800",
  CLAIMED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-sky-100 text-sky-800",
  BACKLOG_SHUTDOWN: "bg-stone-100 text-stone-800",
  WAITING_TO_CLOSE: "bg-purple-100 text-purple-800",
  RETURNED_FOR_CORRECTION: "bg-rose-100 text-rose-800",
  CLOSED: "bg-green-100 text-green-800",
  CANCELED: "bg-slate-200 text-slate-700",
};

function normalizeStatus(status: string): WorkStatusValue {
  return Object.values(WorkStatus).includes(status as WorkStatusValue) ? (status as WorkStatusValue) : WorkStatus.NEW;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold transition duration-300 ease-out hover:-translate-y-0.5 ${colorByStatus[normalized]}`}>{statusLabels[normalized]}</span>;
}
