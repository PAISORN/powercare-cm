import { CalendarPlus, ChevronLeft, ChevronRight, Clock3, Layers3, Wrench } from "lucide-react";
import Link from "next/link";
import { addCalendarDays, isoDateAtUtcNoon } from "../../modules/pm/pm-calendar-query";
import { pmCalendarPlanGroups, type PmCalendarPlanItem } from "./pm-calendar";

const fullDate = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", { day: "numeric", month: "short", timeZone: "UTC" });

export function PmDayColumn({ date, plan, scopeQuery, canManage, today }: { date: string; plan?: PmCalendarPlanItem; scopeQuery: string; canManage: boolean; today: string }) {
  const href = (nextDate: string) => `/dashboardpm?${scopeQuery}&view=day&month=${nextDate.slice(0, 7)}&date=${nextDate}`;
  const groups = plan ? pmCalendarPlanGroups(plan) : [];
  return <section aria-label="ปฏิทิน PM รายวัน" className="min-w-0 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--primary)]">Daily PM</p>
        <h2 className="mt-1 text-xl font-extrabold sm:text-2xl">{fullDate.format(isoDateAtUtcNoon(date))}</h2>
      </div>
      <div className="flex items-center gap-2">
        <Link aria-label="วันก่อนหน้า" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--line)] transition-colors hover:bg-[var(--soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" href={href(addCalendarDays(date, -1))}><ChevronLeft aria-hidden="true" size={20} /></Link>
        <Link className="inline-flex min-h-11 items-center rounded-xl border border-[var(--line)] px-4 text-sm font-bold transition-colors hover:bg-[var(--soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" href={href(today)}>วันนี้</Link>
        <Link aria-label="วันถัดไป" className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[var(--line)] transition-colors hover:bg-[var(--soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" href={href(addCalendarDays(date, 1))}><ChevronRight aria-hidden="true" size={20} /></Link>
      </div>
    </header>
    <div className="grid min-h-[28rem] grid-cols-[4.75rem_minmax(0,1fr)] sm:grid-cols-[6rem_minmax(0,1fr)]">
      <div className="border-r border-[var(--line)] bg-[var(--soft)]/60 p-3 text-center">
        <Clock3 aria-hidden="true" className="mx-auto text-[var(--muted)]" size={18} />
        <span className="mt-2 block text-xs font-bold text-[var(--muted)]">ทั้งวัน</span>
      </div>
      <div className="relative min-w-0 p-4 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_71px,var(--line)_72px)]" />
        {plan ? <Link className="relative block min-w-0 rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 p-4 shadow-sm transition-colors duration-200 hover:bg-[var(--primary)]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" href={`${href(date)}&planId=${plan.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className="min-w-0"><strong className="block break-words text-base text-[var(--primary)]">{plan.status === "DRAFT" ? "Draft PM Plan" : plan.number}</strong><span className="mt-1 block text-sm text-[var(--muted)]">{shortDate.format(isoDateAtUtcNoon(date))} · ไม่ระบุเวลา</span></span>
            <span className="rounded-full border border-[var(--primary)]/30 bg-[var(--surface)] px-3 py-1 text-xs font-bold">{plan.status}</span>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <span className="inline-flex items-center gap-2"><Layers3 aria-hidden="true" size={17} /><strong>{groups.length}</strong> PM Groups</span>
            <span className="inline-flex items-center gap-2"><Wrench aria-hidden="true" size={17} /><strong>{plan._count.works}</strong> PM Works</span>
          </div>
          {groups.length ? <div className="mt-4 flex flex-wrap gap-2" aria-label="PM Groups ในแผน">{groups.map(group => <span className="rounded-lg bg-[var(--surface)] px-2.5 py-1 text-xs font-bold" key={group.id}>{group.code} · {group.name}</span>)}</div> : null}
        </Link> : <div className="relative grid min-h-56 place-items-center rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)]/80 p-6 text-center">
          <div><CalendarPlus aria-hidden="true" className="mx-auto text-[var(--muted)]" size={28} /><h3 className="mt-3 font-extrabold">ยังไม่มีแผน PM ในวันนี้</h3><p className="mt-1 text-sm text-[var(--muted)]">{canManage ? "ใช้แผงด้านขวาเพื่อสร้าง Draft และเพิ่ม PM Group" : "ไม่มีรายการ PM ที่กำหนดไว้สำหรับวันที่เลือก"}</p></div>
        </div>}
      </div>
    </div>
  </section>;
}
