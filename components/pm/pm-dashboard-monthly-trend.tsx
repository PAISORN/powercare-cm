import { ArrowRight, BarChart3 } from "lucide-react";
import Link from "next/link";
import type { PmDashboardSummary } from "../../modules/pm/pm-dashboard-query";

type TrendRow = PmDashboardSummary["monthlyTrend"][number];

export function PmDashboardMonthlyTrend({
  calendarHref,
  rows,
}: {
  calendarHref: string;
  rows: TrendRow[];
}) {
  const axisMax = Math.max(
    1,
    Math.ceil(Math.max(...rows.map((row) => row.total), 1) / 10) * 10,
  );
  const axisLabels = Array.from({ length: 5 }, (_, index) =>
    Math.round(axisMax - (axisMax / 4) * index),
  );

  return (
    <section className="dashboard-content-surface pm-pastel-surface h-full min-w-0 rounded-[2rem] border p-4 text-[#17213b] sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/70 text-[#287ca8] shadow-sm">
            <BarChart3 aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0">
            <p className="inline-flex rounded-full bg-white/55 px-3 py-1.5 text-xs font-black shadow-sm backdrop-blur-sm">
              Monthly PM Trend
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">
              แนวโน้มงาน PM รายเดือน
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              เปรียบเทียบงานตามแผนและงานที่เสร็จสิ้นย้อนหลัง 6 เดือน
            </p>
          </div>
        </div>
        <Link
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-white/65 px-4 text-sm font-black text-[#176b50] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176b50] motion-reduce:transform-none"
          href={calendarHref}
        >
          ดูรายละเอียดใน PM Calendar
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </header>

      <div className="mt-5 flex flex-wrap justify-end gap-x-4 gap-y-2 text-xs font-bold text-slate-600">
        <Legend color="bg-[#64748b]" label="งานทั้งหมด" />
        <Legend color="bg-[#16a36a]" label="เสร็จสิ้น" />
      </div>

      <div className="mt-3 rounded-[1.75rem] border border-white/80 bg-white/55 px-3 pb-4 pt-5 shadow-inner backdrop-blur-sm sm:px-5">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:gap-3">
          <div className="grid h-[320px] grid-rows-5 pb-11 pt-2 text-right text-[10px] font-bold text-slate-500 sm:text-xs">
            {axisLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div className="relative min-w-0">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-11 top-2 grid grid-rows-4"
            >
              {axisLabels.map((_, index) => (
                <span className="border-t border-slate-300/75" key={index} />
              ))}
            </div>
            <div className="relative z-10 grid h-[320px] grid-cols-3 items-end gap-2 sm:gap-3 md:grid-cols-6">
              {rows.map((row, index) => (
                <TrendBars
                  axisMax={axisMax}
                  hiddenOnMobile={index < rows.length - 3}
                  key={row.key}
                  row={row}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendBars({
  axisMax,
  hiddenOnMobile,
  row,
}: {
  axisMax: number;
  hiddenOnMobile: boolean;
  row: TrendRow;
}) {
  const totalHeight = row.total
    ? Math.max(12, Math.round((row.total / axisMax) * 250))
    : 6;
  const completedHeight = row.completed
    ? Math.max(12, Math.round((row.completed / axisMax) * 250))
    : 6;

  return (
    <div
      aria-label={`${row.label}: งานทั้งหมด ${row.total}, เสร็จสิ้น ${row.completed}, กำลังดำเนินการ ${row.inProgress}, เกินกำหนด ${row.overdue}`}
      className={`group relative h-[320px] min-w-0 grid-rows-[1fr_auto] items-end gap-2 text-center outline-none ${hiddenOnMobile ? "hidden md:grid" : "grid"}`}
      role="img"
      tabIndex={0}
    >
      <div className="pointer-events-none absolute bottom-14 left-1/2 z-30 w-44 -translate-x-1/2 rounded-2xl border border-white/90 bg-white/95 p-3 text-left text-xs opacity-0 shadow-xl transition group-hover:opacity-100 group-focus:opacity-100">
        <p className="font-black text-[#17213b]">{row.label}</p>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-slate-600">
          <dt>งานทั้งหมด</dt><dd className="font-black">{row.total}</dd>
          <dt>เสร็จสิ้น</dt><dd className="font-black text-emerald-700">{row.completed}</dd>
          <dt>กำลังดำเนินการ</dt><dd className="font-black text-amber-700">{row.inProgress}</dd>
          <dt>เกินกำหนด</dt><dd className="font-black text-red-700">{row.overdue}</dd>
        </dl>
      </div>
      <div className="flex h-[258px] min-w-0 items-end justify-center gap-1 sm:gap-2">
        <Bar
          color="bg-[#64748b]"
          height={totalHeight}
          label={`ทั้งหมด ${row.total}`}
          value={row.total}
        />
        <Bar
          color="bg-[#16a36a]"
          height={completedHeight}
          label={`เสร็จสิ้น ${row.completed}`}
          value={row.completed}
        />
      </div>
      <span className="min-w-0 truncate text-[10px] font-black text-slate-600 sm:text-xs">
        {row.label}
      </span>
    </div>
  );
}

function Bar({
  color,
  height,
  label,
  value,
}: {
  color: string;
  height: number;
  label: string;
  value: number;
}) {
  return (
    <span
      aria-label={label}
      className={`relative w-full max-w-8 rounded-t-lg ${color} shadow-sm transition-[height] duration-300 motion-reduce:transition-none`}
      style={{ height: `${height}px` }}
    >
      <strong className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-700 sm:text-[10px]">
        {value}
      </strong>
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className={`size-3 rounded-sm ${color}`} />
      {label}
    </span>
  );
}
