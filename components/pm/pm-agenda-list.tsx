import Link from "next/link";
import { isoDateAtUtcNoon, pmMonthGrid } from "../../modules/pm/pm-calendar-query";
import type { PmCalendarPlanItem } from "./pm-calendar";

const formatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function PmAgendaList({ month, plans, scopeQuery, canManage }: { month: string; plans: PmCalendarPlanItem[]; scopeQuery: string; canManage: boolean }) {
  const byDate = new Map(plans.map(plan => [plan.plannedDateKey, plan]));
  const dates = pmMonthGrid(month).filter(date => date.slice(0, 7) === month.slice(0, 7));
  return <section aria-label="รายการแผน PM รายวัน" className="grid gap-2 md:hidden">
    {dates.map(date => {
      const plan = byDate.get(date);
      return <Link className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4" href={`/dashboardpm?${scopeQuery}&month=${month.slice(0, 7)}&date=${date}${plan ? `&planId=${plan.id}` : ""}`} key={date}>
        <span className="font-bold">{formatter.format(isoDateAtUtcNoon(date))}</span>
        {plan ? <span className="text-right text-sm"><strong className="block text-[var(--primary)]">{plan.status === "DRAFT" ? "Draft" : plan.number}</strong><span className="text-xs text-[var(--muted)]">{plan.draftGroups.length} PM Groups</span></span> : <span className="text-sm text-[var(--muted)]">{canManage ? "+ วางแผน" : "ไม่มีแผน"}</span>}
      </Link>;
    })}
  </section>;
}
