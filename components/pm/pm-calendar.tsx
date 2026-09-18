import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { addCalendarMonths, isoDateAtUtcNoon, monthStart, pmMonthGrid } from "../../modules/pm/pm-calendar-query";

const monthFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" });
const dateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", { dateStyle: "long", timeZone: "UTC" });
const weekdays = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

export type PmCalendarPlanItem = { id: string; plannedDateKey: string; status: string; number: string | null; draftGroups: Array<{ pmGroup: { id: string; code: string; name: string } }>; groupSnapshots?: Array<{ id: string; codeSnapshot: string; nameSnapshot: string }>; _count: { works: number } };

export function pmCalendarPlanGroups(plan: PmCalendarPlanItem) {
  return plan.status === "DRAFT"
    ? plan.draftGroups.map(({ pmGroup }) => pmGroup)
    : (plan.groupSnapshots ?? []).map(snapshot => ({ id: snapshot.id, code: snapshot.codeSnapshot, name: snapshot.nameSnapshot }));
}

function planTone(status: string) {
  if (status === "CONFIRMED") return "bg-emerald-500";
  if (status === "COMPLETED") return "bg-blue-500";
  if (status === "CANCELED") return "bg-slate-400";
  return "bg-amber-500";
}

export function PmCalendar({ month, plans, scopeQuery, canManage, today }: { month: string; plans: PmCalendarPlanItem[]; scopeQuery: string; canManage: boolean; today: string }) {
  const currentMonth = monthStart(month);
  const byDate = new Map(plans.map(plan => [plan.plannedDateKey, plan]));
  const calendarHref = (date: string, plan?: PmCalendarPlanItem) => {
    const base = "/dashboardpm?" + scopeQuery + "&view=month&month=" + date.slice(0, 7) + "&date=" + date;
    return plan ? base + "&planId=" + plan.id : base;
  };
  const monthHref = (amount: number) => {
    const nextMonth = addCalendarMonths(currentMonth, amount);
    return "/dashboardpm?" + scopeQuery + "&view=month&month=" + nextMonth.slice(0, 7) + "&date=" + nextMonth;
  };

  return <section aria-label="ปฏิทินแผน PM แบบรายเดือน" className="min-w-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] px-3 py-3 sm:px-5">
      <div className="flex items-center gap-2">
        <Link aria-label="เดือนก่อนหน้า" className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" href={monthHref(-1)}><ChevronLeft aria-hidden="true" size={19} /></Link>
        <Link className="inline-flex min-h-11 items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold transition-colors hover:bg-[var(--soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" href={calendarHref(today)}>Today</Link>
        <Link aria-label="เดือนถัดไป" className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" href={monthHref(1)}><ChevronRight aria-hidden="true" size={19} /></Link>
      </div>
      <div className="text-left sm:text-right">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Month</p>
        <h2 className="mt-0.5 text-lg font-extrabold sm:text-xl">{monthFormatter.format(isoDateAtUtcNoon(currentMonth))}</h2>
      </div>
    </header>

    <div className="grid grid-cols-7" role="grid" aria-label={monthFormatter.format(isoDateAtUtcNoon(currentMonth))}>
      <div className="contents" role="row">{weekdays.map(day => <span className="border-b border-[var(--line)] px-1 py-3 text-center text-xs font-bold text-[var(--muted)] sm:px-4 sm:text-left" key={day} role="columnheader">{day}</span>)}</div>
      {Array.from({ length: 6 }, (_, week) => <div className="contents" key={"week-" + week} role="row">{pmMonthGrid(currentMonth).slice(week * 7, week * 7 + 7).map(date => {
        const plan = byDate.get(date);
        const groupCount = plan ? pmCalendarPlanGroups(plan).length : 0;
        const outside = date.slice(0, 7) !== currentMonth.slice(0, 7);
        const isToday = date === today;
        const cellClass = "min-h-20 min-w-0 border-b border-r border-[var(--line)] p-1.5 outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] sm:min-h-28 sm:p-2.5 lg:min-h-32 xl:min-h-36 ";
        const stateClass = outside
          ? "bg-[var(--soft)]/55 text-[var(--muted)]"
          : isToday
            ? "bg-blue-500/[0.055] hover:bg-blue-500/[0.09]"
            : "hover:bg-[var(--soft)]/70";
        const accessibleLabel = dateFormatter.format(isoDateAtUtcNoon(date)) + (plan ? " มีแผน " + groupCount + " กลุ่ม" : canManage ? " สร้างแผน" : " ไม่มีแผน");

        return <Link
          aria-current={isToday ? "date" : undefined}
          aria-label={accessibleLabel}
          className={cellClass + stateClass}
          href={calendarHref(date, plan)}
          key={date}
          role="gridcell"
        >
          <span className={"inline-grid size-7 place-items-center rounded-full text-xs font-bold sm:size-8 sm:text-sm " + (isToday ? "bg-[var(--primary)] text-white" : "")}>{Number(date.slice(-2))}</span>
          {plan ? <span className="mt-1.5 block overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-sm sm:mt-2 sm:rounded-xl sm:p-2.5">
            <span aria-hidden="true" className={"mb-1.5 block h-1 w-7 rounded-full " + planTone(plan.status)} />
            <strong className="hidden truncate text-xs text-[var(--ink)] sm:block">{plan.status === "DRAFT" ? "Draft PM Plan" : plan.number}</strong>
            <span aria-hidden="true" className={"mx-auto block size-2.5 rounded-full sm:hidden " + planTone(plan.status)} />
            <span className="mt-1 hidden truncate text-[11px] text-[var(--muted)] sm:block">{groupCount} PM Groups{plan._count.works ? " · " + plan._count.works + " Works" : ""}</span>
          </span> : null}
        </Link>;
      })}</div>)}
    </div>
  </section>;
}