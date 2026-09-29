import { CalendarDays, Columns3 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type PmCalendarView = "month" | "day";

export function PmCalendarViewSwitcher({
  view,
  monthHref,
  dayHref,
  periodNavigation,
  periodLabel,
  summary,
}: {
  view: PmCalendarView;
  monthHref: string;
  dayHref: string;
  periodNavigation?: ReactNode;
  periodLabel?: string;
  summary?: ReactNode;
}) {
  const itemClass = (active: boolean) =>
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] " +
    (active
      ? "bg-[var(--ink)] text-[var(--surface)] shadow-sm"
      : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]");
  return (
    <section className="grid items-center gap-4 xl:grid-cols-[minmax(190px,1fr)_auto_auto] xl:gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/45 text-[var(--primary)] dark:bg-white/10">
          <CalendarDays aria-hidden="true" size={21} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
            Calendar view
          </p>
          {periodLabel ? (
            <p className="mt-1 truncate text-xl font-extrabold leading-none text-[var(--ink)] sm:text-2xl">
              {periodLabel}
            </p>
          ) : null}
        </div>
      </div>
      {summary}
      <div className="flex flex-wrap items-center justify-end gap-3 xl:flex-nowrap">
        {periodNavigation}
        <nav
          aria-label="รูปแบบปฏิทิน PM"
          className="grid grid-cols-2 rounded-full bg-[var(--soft)] p-1"
        >
          <Link
            aria-current={view === "month" ? "page" : undefined}
            className={itemClass(view === "month")}
            href={monthHref}
          >
            <CalendarDays aria-hidden="true" size={18} />
            Month
          </Link>
          <Link
            aria-current={view === "day" ? "page" : undefined}
            className={itemClass(view === "day")}
            href={dayHref}
          >
            <Columns3 aria-hidden="true" size={18} />
            Day
          </Link>
        </nav>
      </div>
    </section>
  );
}
