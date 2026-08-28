import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { CmDateFilterBar } from "./cm-date-filter-bar";
import type { CmDateFilterInput } from "../modules/filters/cm-date-filter";

export function StoreDashboardFilter({
  activeDateFilter,
  organizationId,
  plantId,
}: {
  activeDateFilter?: CmDateFilterInput;
  organizationId: string;
  plantId: string;
}) {
  const clearHref = `/dashboardstore?organizationId=${encodeURIComponent(organizationId)}&plantId=${encodeURIComponent(plantId)}`;

  return (
    <form className="dashboard-glass-card rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" method="get">
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="plantId" type="hidden" value={plantId} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <CmDateFilterBar
          defaultDate={activeDateFilter?.date}
          defaultEndDate={activeDateFilter?.endDate}
          defaultMode={activeDateFilter?.mode}
          defaultMonth={activeDateFilter?.month}
          defaultStartDate={activeDateFilter?.startDate}
          defaultYear={activeDateFilter?.year}
          initiallyUnset={!activeDateFilter}
          label="ช่วงวันที่ของรายการเคลื่อนไหว"
        />
        <button className="inline-flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 font-extrabold text-white shadow-sm transition hover:bg-[var(--primary-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" type="submit">
          <SlidersHorizontal aria-hidden="true" size={18} />
          แสดงข้อมูล
        </button>
        <Link className="inline-flex min-h-[52px] cursor-pointer items-center justify-center rounded-2xl border border-[var(--line)] px-5 font-bold transition hover:bg-[var(--soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]" href={clearHref}>
          ล้าง
        </Link>
      </div>
    </form>
  );
}
