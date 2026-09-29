import Link from "next/link";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
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
    <details className="group relative z-20" data-testid="store-dashboard-filter">
      <summary className="ml-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal aria-hidden="true" size={17} />
        ตัวกรอง
        {activeDateFilter ? (
          <span className="grid size-6 place-items-center rounded-full bg-white/20 text-[11px]">
            1
          </span>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className="transition-transform duration-200 group-open:rotate-180"
          size={16}
        />
      </summary>

      <form className="dashboard-glass-card mt-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" method="get">
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
    </details>
  );
}
