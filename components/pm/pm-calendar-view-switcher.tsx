import { CalendarDays, Columns3 } from "lucide-react";
import Link from "next/link";

export type PmCalendarView = "month" | "day";

export function PmCalendarViewSwitcher({ view, monthHref, dayHref }: { view: PmCalendarView; monthHref: string; dayHref: string }) {
  const itemClass = (active: boolean) => "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] " + (active ? "bg-[var(--ink)] text-[var(--surface)] shadow-sm" : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]");
  return <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 shadow-sm sm:px-4">
    <div>
      <p className="text-sm font-extrabold text-[var(--ink)]">Calendar view</p>
      <p className="text-xs text-[var(--muted)]">เลือกดูแผนแบบรายเดือนหรือรายวัน</p>
    </div>
    <nav aria-label="รูปแบบปฏิทิน PM" className="grid grid-cols-2 rounded-2xl bg-[var(--soft)] p-1">
      <Link aria-current={view === "month" ? "page" : undefined} className={itemClass(view === "month")} href={monthHref}><CalendarDays aria-hidden="true" size={18} />Month</Link>
      <Link aria-current={view === "day" ? "page" : undefined} className={itemClass(view === "day")} href={dayHref}><Columns3 aria-hidden="true" size={18} />Day</Link>
    </nav>
  </section>;
}