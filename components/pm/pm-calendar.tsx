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

export function PmCalendar({ month, plans, scopeQuery, canManage }: { month: string; plans: PmCalendarPlanItem[]; scopeQuery: string; canManage: boolean }) {
  const currentMonth = monthStart(month);
  const byDate = new Map(plans.map(plan => [plan.plannedDateKey, plan]));
  const dateHref = (date: string, plan?: PmCalendarPlanItem) => `/dashboardpm?${scopeQuery}&view=month&month=${date.slice(0, 7)}&date=${date}${plan ? `&planId=${plan.id}` : ""}`;
  return <section aria-label="ปฏิทินแผน PM แบบรายเดือน" className="min-w-0 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)] sm:p-4">
    <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
      <Link aria-label="เดือนก่อนหน้า" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--line)] transition-colors hover:bg-[var(--soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" href={`/dashboardpm?${scopeQuery}&view=month&month=${addCalendarMonths(currentMonth, -1).slice(0, 7)}`}><ChevronLeft aria-hidden="true" size={20} /></Link>
      <h2 className="text-center text-lg font-extrabold sm:text-xl">{monthFormatter.format(isoDateAtUtcNoon(currentMonth))}</h2>
      <Link aria-label="เดือนถัดไป" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--line)] transition-colors hover:bg-[var(--soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" href={`/dashboardpm?${scopeQuery}&view=month&month=${addCalendarMonths(currentMonth, 1).slice(0, 7)}`}><ChevronRight aria-hidden="true" size={20} /></Link>
    </div>
    <div className="grid grid-cols-7" role="grid" aria-label={monthFormatter.format(isoDateAtUtcNoon(currentMonth))}>
      <div className="contents" role="row">{weekdays.map(day => <span className="py-2 text-center text-xs font-bold text-[var(--muted)]" key={day} role="columnheader">{day}</span>)}</div>
      {Array.from({ length: 6 }, (_, week) => <div className="contents" key={`week-${week}`} role="row">{pmMonthGrid(currentMonth).slice(week * 7, week * 7 + 7).map(date => {
        const plan = byDate.get(date);
        const groupCount = plan ? pmCalendarPlanGroups(plan).length : 0;
        const outside = date.slice(0, 7) !== currentMonth.slice(0, 7);
        return <Link
          aria-label={`${dateFormatter.format(isoDateAtUtcNoon(date))}${plan ? ` มีแผน ${groupCount} กลุ่ม` : canManage ? " สร้างแผน" : " ไม่มีแผน"}`}
          className={`min-h-20 min-w-0 border-b border-r border-[var(--line)] p-1 outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:min-h-28 sm:p-2 ${outside ? "bg-[var(--soft)] opacity-50" : "hover:bg-[var(--soft)]"}`}
          href={dateHref(date, plan)} key={date} role="gridcell"
        >
          <span className="text-xs font-bold sm:text-sm">{Number(date.slice(-2))}</span>
          {plan ? <span className="mt-1 block overflow-hidden rounded-md bg-[var(--primary)]/12 p-1 text-[10px] font-bold leading-tight text-[var(--primary)] sm:mt-2 sm:rounded-xl sm:p-2 sm:text-xs"><span className="hidden truncate sm:block">{plan.status === "DRAFT" ? "Draft" : plan.number}</span><span aria-hidden="true" className="mx-auto block h-2 w-2 rounded-full bg-[var(--primary)] sm:hidden" /><span className="mt-1 hidden font-normal text-[var(--muted)] sm:block">{groupCount} PM Groups{plan._count.works ? ` · ${plan._count.works} Works` : ""}</span></span> : null}
        </Link>;
      })}</div>)}
    </div>
  </section>;
}
