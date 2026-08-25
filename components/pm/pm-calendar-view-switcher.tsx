import { CalendarDays, Columns3 } from "lucide-react";
import Link from "next/link";

export type PmCalendarView = "month" | "day";

export function PmCalendarViewSwitcher({ view, monthHref, dayHref }: { view: PmCalendarView; monthHref: string; dayHref: string }) {
  const itemClass = (active: boolean) => `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${active ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"}`;
  return <nav aria-label="รูปแบบปฏิทิน PM" className="grid grid-cols-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-1">
    <Link aria-current={view === "month" ? "page" : undefined} className={itemClass(view === "month")} href={monthHref}><CalendarDays aria-hidden="true" size={18} />ภาพรวมเดือน</Link>
    <Link aria-current={view === "day" ? "page" : undefined} className={itemClass(view === "day")} href={dayHref}><Columns3 aria-hidden="true" size={18} />รายวัน</Link>
  </nav>;
}
