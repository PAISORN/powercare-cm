import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  addCalendarMonths,
  isoDateAtUtcNoon,
  monthStart,
  pmMonthGrid,
  type AnnualPmCalendarEntry,
} from "../../modules/pm/pm-calendar-query";
import {
  pmTargetColor,
  pmTargetGlowColor,
} from "../../modules/pm/pm-target-color";
import {
  PmCalendarViewSwitcher,
  type PmCalendarView,
} from "./pm-calendar-view-switcher";

const monthFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  dateStyle: "long",
  timeZone: "UTC",
});
const weekdayFormatter = new Intl.DateTimeFormat("th-TH", {
  weekday: "long",
  timeZone: "UTC",
});
const weekdays = [
  "อาทิตย์",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
];

const weekdayCardTones = [
  "border-[#ebc6cf] bg-gradient-to-br from-[#fff4f6] to-[#f8dde3] text-[#17213b] shadow-[0_10px_28px_rgba(196,112,132,0.20)] hover:shadow-[0_14px_34px_rgba(196,112,132,0.30)]",
  "border-[#eadcae] bg-gradient-to-br from-[#fff9e8] to-[#f8edc7] text-[#17213b] shadow-[0_10px_28px_rgba(190,158,72,0.20)] hover:shadow-[0_14px_34px_rgba(190,158,72,0.30)]",
  "border-[#dcc6dc] bg-gradient-to-br from-[#faf1fa] to-[#eedced] text-[#17213b] shadow-[0_10px_28px_rgba(167,116,166,0.20)] hover:shadow-[0_14px_34px_rgba(167,116,166,0.30)]",
  "border-[#c3d8c6] bg-gradient-to-br from-[#f1f8f2] to-[#dcebdd] text-[#17213b] shadow-[0_10px_28px_rgba(112,157,120,0.20)] hover:shadow-[0_14px_34px_rgba(112,157,120,0.30)]",
  "border-[#e6c9aa] bg-gradient-to-br from-[#fff6eb] to-[#f5e0c5] text-[#17213b] shadow-[0_10px_28px_rgba(190,139,87,0.20)] hover:shadow-[0_14px_34px_rgba(190,139,87,0.30)]",
  "border-[#c5d8e5] bg-gradient-to-br from-[#f1f7fb] to-[#dceaf3] text-[#17213b] shadow-[0_10px_28px_rgba(103,151,181,0.20)] hover:shadow-[0_14px_34px_rgba(103,151,181,0.30)]",
  "border-[#d3cae6] bg-gradient-to-br from-[#f7f4fc] to-[#e5e0f1] text-[#17213b] shadow-[0_10px_28px_rgba(133,111,173,0.20)] hover:shadow-[0_14px_34px_rgba(133,111,173,0.30)]",
];

export type PmCalendarPlanItem = {
  id: string;
  plannedDateKey: string;
  status: string;
  number: string | null;
  draftGroups: Array<{ pmGroup: { id: string; code: string; name: string } }>;
  groupSnapshots?: Array<{
    id: string;
    codeSnapshot: string;
    nameSnapshot: string;
  }>;
  _count: { works: number };
  annualReleaseBatch?: { id: string } | null;
};

export function annualPmCalendarHref(
  item: AnnualPmCalendarEntry,
  scopeQuery: string,
  canManage = true,
  view: "month" | "day" = "month",
) {
  const date = item.scheduleDateKey;
  if (item.status === "RELEASED" || item.releasePmPlanId) {
    return `/dashboardpm/annual/${encodeURIComponent(item.id)}?${scopeQuery}`;
  }
  if (["ACTIVE", "DRAFT"].includes(item.planStatus) && canManage) {
    return `/dashboardpm/calendar?${scopeQuery}&view=${view}&month=${date.slice(0, 7)}&date=${date}&annualPlanId=${encodeURIComponent(item.planId)}&scheduleId=${encodeURIComponent(item.id)}&release=annual`;
  }
  return `/dashboardpm/setup?${scopeQuery}&year=${date.slice(0, 4)}&planId=${encodeURIComponent(item.planId)}&view=month&month=${Number(date.slice(5, 7))}&date=${date}`;
}

export function pmCalendarPlanGroups(plan: PmCalendarPlanItem) {
  return plan.status === "DRAFT"
    ? plan.draftGroups.map(({ pmGroup }) => pmGroup)
    : (plan.groupSnapshots ?? []).map((snapshot) => ({
        id: snapshot.id,
        code: snapshot.codeSnapshot,
        name: snapshot.nameSnapshot,
      }));
}

export function PmCalendar({
  month,
  plans,
  annualEntries = [],
  scopeQuery,
  canManage,
  today,
  viewSwitcher,
}: {
  month: string;
  plans: PmCalendarPlanItem[];
  annualEntries?: AnnualPmCalendarEntry[];
  scopeQuery: string;
  canManage: boolean;
  today: string;
  viewSwitcher?: {
    view: PmCalendarView;
    monthHref: string;
    dayHref: string;
  };
}) {
  const currentMonth = monthStart(month);
  const currentMonthKey = currentMonth.slice(0, 7);
  const gridDates = pmMonthGrid(currentMonth);
  const byDate = new Map(plans.map((plan) => [plan.plannedDateKey, plan]));
  const annualByDate = new Map<string, AnnualPmCalendarEntry[]>();

  for (const entry of annualEntries) {
    const items = annualByDate.get(entry.scheduleDateKey) ?? [];
    items.push(entry);
    annualByDate.set(entry.scheduleDateKey, items);
  }

  const visiblePlans = plans.filter((plan) =>
    plan.plannedDateKey.startsWith(currentMonthKey),
  );
  const visibleAnnualEntries = annualEntries.filter((entry) =>
    entry.scheduleDateKey.startsWith(currentMonthKey),
  );
  const scheduledDays = new Set([
    ...visiblePlans.map((plan) => plan.plannedDateKey),
    ...visibleAnnualEntries.map((entry) => entry.scheduleDateKey),
  ]).size;
  const totalWorks = visiblePlans.reduce(
    (sum, plan) => sum + plan._count.works,
    0,
  );

  const calendarHref = (date: string, plan?: PmCalendarPlanItem) => {
    const base =
      "/dashboardpm/calendar?" +
      scopeQuery +
      "&view=month&month=" +
      date.slice(0, 7) +
      "&date=" +
      date;
    return plan ? base + "&planId=" + plan.id : base;
  };
  const monthHref = (amount: number) => {
    const nextMonth = addCalendarMonths(currentMonth, amount);
    return (
      "/dashboardpm/calendar?" +
      scopeQuery +
      "&view=month&month=" +
      nextMonth.slice(0, 7) +
      "&date=" +
      nextMonth
    );
  };
  const dayHref = (date: string) => {
    return (
      "/dashboardpm/calendar?" +
      scopeQuery +
      "&view=day&month=" +
      date.slice(0, 7) +
      "&date=" +
      date
    );
  };

  return (
    <section aria-label="ปฏิทินแผน PM แบบรายเดือน" className="min-w-0">
      <header className="px-1 py-1 sm:px-2">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300">
              <CalendarDays aria-hidden="true" size={22} />
            </span>
            <div className="min-w-0">
              <p className="inline-flex rounded-full bg-white/35 px-4 py-2 text-sm font-semibold text-[var(--ink)] backdrop-blur-sm dark:bg-white/10">
                Monthly PM Schedule
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--ink)] sm:text-3xl">
                แผนบำรุงรักษาเชิงป้องกันประจำเดือน
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                เลือกการ์ดวันที่เพื่อดูแผน รายการ Annual PM และงานของวันนั้น
              </p>
            </div>
          </div>
        </div>
      </header>

      {viewSwitcher ? (
        <div className="mt-4 px-1 sm:px-2">
          <PmCalendarViewSwitcher
            {...viewSwitcher}
            periodLabel={monthFormatter.format(isoDateAtUtcNoon(currentMonth))}
            summary={
              <div className="grid grid-cols-3 gap-2">
                <CalendarMetric label="วันที่มี PM" value={scheduledDays} />
                <CalendarMetric
                  label="Annual PM"
                  value={visibleAnnualEntries.length}
                />
                <CalendarMetric label="PM Works" value={totalWorks} />
              </div>
            }
            periodNavigation={
              <nav
                aria-label="เปลี่ยนเดือนปฏิทิน"
                className="flex items-center gap-2"
              >
                <Link
                  aria-label="เดือนก่อนหน้า"
                  className="grid min-h-11 min-w-11 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  href={monthHref(-1)}
                >
                  <ChevronLeft aria-hidden="true" size={19} />
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold transition-colors hover:bg-[var(--soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  href={calendarHref(today)}
                >
                  Today
                </Link>
                <Link
                  aria-label="เดือนถัดไป"
                  className="grid min-h-11 min-w-11 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  href={monthHref(1)}
                >
                  <ChevronRight aria-hidden="true" size={19} />
                </Link>
              </nav>
            }
          />
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="mt-5 h-px bg-gradient-to-r from-transparent via-[var(--line)] to-transparent"
        data-pm-calendar-separator
      />

      <div className="mt-5 hidden grid-cols-7 gap-3 px-1 lg:grid" role="row">
        {weekdays.map((day) => (
          <span
            className="rounded-full border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-3 text-center text-sm font-black text-[var(--ink)] shadow-sm xl:text-base"
            key={day}
            role="columnheader"
          >
            {day}
          </span>
        ))}
      </div>

      <div
        aria-label={monthFormatter.format(isoDateAtUtcNoon(currentMonth))}
        className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7"
        role="grid"
      >
        {Array.from({ length: 6 }, (_, week) => (
          <div className="contents" key={"week-" + week} role="row">
            {gridDates.slice(week * 7, week * 7 + 7).map((date) => {
              const plan = byDate.get(date);
              const annualForDate = annualByDate.get(date) ?? [];
              const groups = plan ? pmCalendarPlanGroups(plan) : [];
              const outside = date.slice(0, 7) !== currentMonthKey;
              const isToday = date === today;
              const itemCount = annualForDate.length;
              const visibleAnnualItems = annualForDate.slice(0, 2);
              const overflowCount = Math.max(
                0,
                annualForDate.length - visibleAnnualItems.length,
              );
              const weekdayIndex = isoDateAtUtcNoon(date).getUTCDay();
              const workTotal = annualForDate.reduce(
                (sum, item) => sum + (item.workTotal ?? 0),
                0,
              );
              const workCompleted = annualForDate.reduce(
                (sum, item) => sum + (item.workCompleted ?? 0),
                0,
              );
              const progress = workTotal
                ? Math.round((workCompleted / workTotal) * 100)
                : 0;
              const assignees = uniqueAssignees(annualForDate);
              const lead = assignees[0];
              const statusLabel = calendarDayStatus(annualForDate, progress);
              const accessibleLabel =
                dateFormatter.format(isoDateAtUtcNoon(date)) +
                (plan ? " มีแผน " + groups.length + " กลุ่ม" : "") +
                (annualForDate.length
                  ? " มี Annual PM " + annualForDate.length + " รายการ"
                  : !plan && canManage
                    ? " เลือกวันเพื่อสร้างแผน"
                    : !plan
                      ? " ไม่มีแผน"
                      : "");

              return (
                <article
                  aria-current={isToday ? "date" : undefined}
                  aria-label={accessibleLabel}
                  className={[
                    "group min-w-0 overflow-visible rounded-[1.75rem] border p-3.5 transition duration-200 ease-out hover:-translate-y-1 hover:scale-[1.01] focus-within:ring-2 focus-within:ring-[var(--primary)] motion-reduce:transform-none",
                    "lg:h-[156px]",
                    outside
                      ? "hidden border-[var(--line)] bg-[var(--soft)]/45 opacity-55 lg:block"
                      : plan || annualForDate.length
                        ? weekdayCardTones[weekdayIndex]
                        : "border-[#cdd5dd] bg-gradient-to-br from-[#f3f6f8] to-[#e4e9ee] text-[#52606d] shadow-[0_10px_28px_rgba(122,139,156,0.18)] hover:shadow-[0_14px_34px_rgba(122,139,156,0.26)]",
                    isToday
                      ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/15"
                      : "",
                  ].join(" ")}
                  data-pm-day-card
                  key={date}
                  role="gridcell"
                >
                  <div className="flex h-full min-h-0 flex-col">
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_3.5rem] items-start gap-2">
                      <div className="grid min-h-[4.75rem] min-w-0 content-start gap-1.5 overflow-visible">
                        {visibleAnnualItems.map((item) => (
                          <Link
                            aria-label={`${item.targetName} ${item.mainAssetCount} Main Assets`}
                            className="flex min-h-8 min-w-0 items-center gap-1.5 rounded-full bg-white/55 px-2 py-0.5 text-[10px] font-black shadow-none transition duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:brightness-[1.03] hover:shadow-[0_8px_22px_var(--pm-target-glow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] motion-reduce:transform-none"
                            data-pm-target-row
                            href={annualPmCalendarHref(
                              item,
                              scopeQuery,
                              canManage,
                            )}
                            key={item.id}
                            scroll={false}
                            style={
                              {
                                ...pmTargetColor(item.targetId),
                                "--pm-target-glow": pmTargetGlowColor(
                                  item.targetId,
                                ),
                              } as CSSProperties
                            }
                            title={item.targetName}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {item.targetName}
                            </span>
                            <span
                              aria-label={"Main Assets " + item.mainAssetCount}
                              className="grid size-6 shrink-0 place-items-center rounded-full bg-white/65 text-[9px] font-black"
                            >
                              {item.mainAssetCount}
                            </span>
                          </Link>
                        ))}

                        {overflowCount ? (
                          <Link
                            aria-label={
                              "ดูรายการ PM อีก " +
                              overflowCount +
                              " รายการในวันที่ " +
                              date
                            }
                            className="w-fit rounded-full bg-white/45 px-2 py-0.5 text-[9px] font-black opacity-70 transition duration-200 hover:-translate-y-0.5 hover:bg-white/75 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] motion-reduce:transform-none"
                            href={dayHref(date)}
                            scroll={false}
                          >
                            +{overflowCount} รายการ
                          </Link>
                        ) : null}

                        {!outside && !plan && !annualForDate.length ? (
                          <Link
                            className="flex min-h-[4.75rem] items-center justify-center gap-2 rounded-[1.35rem] border border-dashed border-current/20 bg-white/30 px-2 text-center text-[10px] font-bold opacity-70 transition duration-200 hover:-translate-y-0.5 hover:bg-white/55 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] motion-reduce:transform-none"
                            href={calendarHref(date)}
                            scroll={false}
                          >
                            <Plus aria-hidden="true" size={14} />
                            {canManage ? "เลือกวันเพื่อวางแผน" : "ไม่มีแผน PM"}
                          </Link>
                        ) : null}
                      </div>

                      <Link
                        aria-label={`เปิดวันที่ ${date}`}
                        className={[
                          "grid size-14 shrink-0 place-items-center rounded-full border border-white/80 bg-white/85 text-2xl font-black text-slate-950 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] motion-reduce:transform-none",
                          isToday ? "ring-2 ring-[var(--primary)]/35" : "",
                        ].join(" ")}
                        href={calendarHref(date, plan)}
                        scroll={false}
                      >
                        {Number(date.slice(-2))}
                      </Link>
                    </div>

                    {annualForDate.length ? (
                      <>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/65">
                            <span
                              className="block h-full rounded-full bg-slate-950/80 transition-[width] duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </span>
                          <strong className="shrink-0 text-[11px] font-black">
                            {progress}%
                          </strong>
                        </div>

                        <div className="mt-auto flex min-w-0 items-end justify-between gap-2 pt-1.5">
                          <span className="flex min-w-0 items-center gap-2">
                            <AssigneeAvatars assignees={assignees} />
                            <span className="min-w-0">
                              <strong className="block truncate text-[10px] font-black">
                                {lead?.fullName ?? "ยังไม่มอบหมาย"}
                              </strong>
                              <span className="block text-[9px] font-bold opacity-65">
                                {formatDayDate(date)}
                              </span>
                            </span>
                          </span>
                          <span className="max-w-[48%] shrink-0 truncate rounded-full bg-white/70 px-2 py-1 text-[9px] font-black shadow-sm">
                            {statusLabel}
                          </span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function uniqueAssignees(entries: AnnualPmCalendarEntry[]) {
  const assignees = new Map<
    string,
    NonNullable<AnnualPmCalendarEntry["assignees"]>[number]
  >();
  for (const entry of entries) {
    for (const assignee of entry.assignees ?? []) {
      if (!assignees.has(assignee.id)) assignees.set(assignee.id, assignee);
    }
  }
  return [...assignees.values()];
}

function calendarDayStatus(entries: AnnualPmCalendarEntry[], progress: number) {
  if (!entries.length) return "ไม่มีงาน";
  const hasReleased = entries.some(
    (item) => item.status === "RELEASED" || item.releasePmPlanId,
  );
  if (hasReleased && progress === 100) return "เสร็จสิ้น";
  if (hasReleased && progress > 0) return "กำลังดำเนินการ";
  if (hasReleased) return "รอดำเนินการ";
  return "พร้อมเริ่ม PM";
}

function formatDayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function AssigneeAvatars({
  assignees,
}: {
  assignees: NonNullable<AnnualPmCalendarEntry["assignees"]>;
}) {
  if (!assignees.length) {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-white/80 bg-white/55 shadow-sm">
        <UserRound aria-hidden="true" size={13} strokeWidth={2.4} />
      </span>
    );
  }

  return (
    <span
      className="flex shrink-0 -space-x-2"
      aria-label={
        "ผู้รับผิดชอบ " + assignees.map((item) => item.fullName).join(", ")
      }
    >
      {assignees.slice(0, 2).map((assignee) => (
        <span
          className="grid size-7 place-items-center overflow-hidden rounded-full border-2 border-white/85 bg-white/60 text-[9px] font-black shadow-sm"
          key={assignee.id}
          title={assignee.fullName}
        >
          {assignee.hasPhoto ? (
            <img
              alt={assignee.fullName}
              className="size-full object-cover"
              loading="lazy"
              src={
                "/profile-photo/" +
                assignee.id +
                (assignee.photoVersion ? "?v=" + assignee.photoVersion : "")
              }
            />
          ) : (
            initials(assignee.fullName)
          )}
        </span>
      ))}
      {assignees.length > 2 ? (
        <span className="grid size-7 place-items-center rounded-full border-2 border-white/85 bg-white/70 text-[9px] font-black shadow-sm">
          +{assignees.length - 2}
        </span>
      ) : null}
    </span>
  );
}

function initials(fullName: string) {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function CalendarMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-[var(--line)] bg-[var(--soft)] px-4 py-2 text-center sm:min-w-28 sm:text-left">
      <strong className="block text-base font-extrabold text-[var(--ink)]">
        {value}
      </strong>
      <span className="block text-[10px] font-bold text-[var(--muted)] sm:text-xs">
        {label}
      </span>
    </span>
  );
}
