"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useMemo, useState } from "react";

export type StoreTrendMode = "threeMonths" | "day" | "week" | "month" | "year";
export type StoreTrendRow = { label: string; tooltipLabel: string; issued: number; previous: number; quantity: number };
export type StoreTrendSeries = Record<StoreTrendMode, StoreTrendRow[]>;
export type StoreCategoryRow = { label: string; value: number; detail: string; color: string };

export function StoreIssueTrend({ initialBucket, series, showValue }: { initialBucket: StoreTrendMode; series: StoreTrendSeries; showValue: boolean }) {
  const [bucket, setBucket] = useState(initialBucket);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rows = series[bucket];
  const width = 760;
  const height = 285;
  const plot = { left: 58, right: 18, top: 20, bottom: 42 };
  const chartWidth = width - plot.left - plot.right;
  const chartHeight = height - plot.top - plot.bottom;
  const smoothingRadius = trendSmoothingRadius[bucket];
  const displayedIssued = smoothValues(rows.map((row) => row.issued), smoothingRadius);
  const displayedPrevious = smoothValues(rows.map((row) => row.previous), smoothingRadius);
  const displayedQuantity = smoothValues(rows.map((row) => row.quantity), smoothingRadius);
  const maximum = Math.max(1, ...displayedIssued, ...displayedPrevious);
  const axisMaximum = niceMaximum(maximum);
  const quantityMaximum = niceMaximum(Math.max(1, ...displayedQuantity));
  const x = (index: number) => plot.left + (rows.length <= 1 ? chartWidth / 2 : (index / (rows.length - 1)) * chartWidth);
  const y = (value: number) => plot.top + chartHeight - (value / axisMaximum) * chartHeight;
  const quantityY = (value: number) => plot.top + chartHeight - (value / quantityMaximum) * chartHeight;
  const currentPoints = displayedIssued.map((value, index) => ({ x: x(index), y: y(value) }));
  const previousPoints = displayedPrevious.map((value, index) => ({ x: x(index), y: y(value) }));
  const quantityPoints = displayedQuantity.map((value, index) => ({ x: x(index), y: quantityY(value) }));
  const currentPath = smoothPath(currentPoints);
  const previousPath = smoothPath(previousPoints);
  const quantityPath = smoothPath(quantityPoints);
  const areaPath = currentPoints.length ? `${currentPath} L ${currentPoints.at(-1)!.x} ${plot.top + chartHeight} L ${currentPoints[0].x} ${plot.top + chartHeight} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const visibleLabels = useMemo(() => {
    if (rows.length <= 7) return new Set(rows.map((_, index) => index));
    return new Set(Array.from({ length: 7 }, (_, index) => Math.round((index * (rows.length - 1)) / 6)));
  }, [rows]);
  const activeRow = activeIndex == null ? null : rows[activeIndex];
  const previousLabel = showValue ? previousValueLabels[bucket] : previousQuantityLabels[bucket];

  function trackPointer(event: PointerEvent<SVGSVGElement>) {
    if (!rows.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    const ratio = Math.max(0, Math.min(1, (svgX - plot.left) / chartWidth));
    setActiveIndex(Math.round(ratio * (rows.length - 1)));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs font-bold text-[var(--muted)]">
        <span className="inline-flex items-center gap-2"><i className="h-0.5 w-6 rounded bg-blue-600" />{showValue ? "มูลค่า (บาท)" : "จำนวนที่เบิก"}</span>
        <span className="inline-flex items-center gap-2"><i className="relative h-0.5 w-6 rounded bg-orange-500 after:absolute after:left-1/2 after:top-1/2 after:size-1.5 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-orange-500" />จำนวนรายการที่เบิก</span>
        <span className="inline-flex items-center gap-2"><i className="w-6 border-t-2 border-dashed border-slate-400" />{previousLabel}</span>
        <span className="text-[10px] font-semibold opacity-80">เส้นแสดงแนวโน้ม · ชี้เพื่อดูค่าจริง</span>
        <label className="relative ml-auto">
          <span className="sr-only">รูปแบบการแสดงกราฟ</span>
          <select className="min-h-10 cursor-pointer appearance-none rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2 pl-3 pr-9 font-bold text-[var(--ink)] outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500" onChange={(event) => { setBucket(event.target.value as StoreTrendMode); setActiveIndex(null); }} value={bucket}>
            <option value="threeMonths">3 เดือนย้อนหลัง</option>
            <option value="day">รายวัน</option>
            <option value="week">รายสัปดาห์</option>
            <option value="month">รายเดือน</option>
            <option value="year">รายปี</option>
          </select>
          <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">⌄</span>
        </label>
      </div>

      <svg aria-label="กราฟมูลค่าการเบิกจ่ายสินค้าเปรียบเทียบช่วงก่อนหน้า" className="h-auto w-full touch-pan-y overflow-visible" onPointerLeave={() => setActiveIndex(null)} onPointerMove={trackPointer} role="img" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="store-issue-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const tickY = plot.top + chartHeight - tick * chartHeight;
          return <g key={tick}><line stroke="var(--line)" strokeDasharray="4 6" x1={plot.left} x2={width - plot.right} y1={tickY} y2={tickY} /><text fill="var(--muted)" fontSize="10" textAnchor="end" x={plot.left - 10} y={tickY + 4}>{formatCompact(axisMaximum * tick)}</text></g>;
        })}
        {areaPath ? <path d={areaPath} fill="url(#store-issue-area)" /> : null}
        {previousPath ? <path d={previousPath} fill="none" stroke="#94a3b8" strokeDasharray="5 6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /> : null}
        {currentPath ? <path d={currentPath} fill="none" stroke="#2563eb" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /> : null}
        {quantityPath ? <path d={quantityPath} fill="none" stroke="#f97316" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" /> : null}
        {rows.map((row, index) => visibleLabels.has(index) ? <text fill="var(--muted)" fontSize="10" key={`${row.label}-${index}`} textAnchor={index === 0 ? "start" : index === rows.length - 1 ? "end" : "middle"} x={x(index)} y={height - 12}>{row.label}</text> : null)}

        {activeRow && activeIndex != null ? <g className="pointer-events-none">
          <line stroke="#2563eb" strokeDasharray="3 4" strokeOpacity="0.42" x1={x(activeIndex)} x2={x(activeIndex)} y1={plot.top} y2={plot.top + chartHeight} />
          <circle cx={x(activeIndex)} cy={currentPoints[activeIndex].y} fill="#2563eb" r="5" stroke="var(--surface)" strokeWidth="3" />
          <circle cx={x(activeIndex)} cy={quantityPoints[activeIndex].y} fill="#f97316" r="5" stroke="var(--surface)" strokeWidth="3" />
          <g transform={`translate(${tooltipX(x(activeIndex), width)}, ${Math.max(8, Math.min(currentPoints[activeIndex].y, quantityPoints[activeIndex].y) - 92)})`}>
            <rect fill="var(--surface-raised)" height="78" rx="10" stroke="var(--line)" width="176" />
            <text fill="var(--ink)" fontSize="11" fontWeight="700" x="12" y="22">{activeRow.tooltipLabel}</text>
            <text fill="#2563eb" fontSize="12" fontWeight="800" x="12" y="43">{showValue ? formatMoneyFull(activeRow.issued) : `${formatNumber(activeRow.issued)} หน่วย`}</text>
            <text fill="#f97316" fontSize="12" fontWeight="800" x="12" y="64">{formatNumber(activeRow.quantity)} รายการเบิก</text>
          </g>
        </g> : null}
      </svg>
    </div>
  );
}

export function StoreCategoryDonut({ rows, total, showValue }: { rows: StoreCategoryRow[]; total: number; showValue: boolean }) {
  if (!rows.length || total <= 0) return <ChartEmpty text="ยังไม่มี Stock สำหรับแสดงสัดส่วน" />;

  let offset = 0;
  return (
    <div className="grid items-center gap-7">
      <div className="relative mx-auto aspect-square w-full max-w-[20rem]">
        <svg aria-label="สัดส่วน Stock แยกตามประเภท" className="size-full -rotate-90" role="img" viewBox="0 0 120 120">
          <circle cx="60" cy="60" fill="none" r="45" stroke="var(--soft)" strokeWidth="18" />
          {rows.map((row) => {
            const percentage = (row.value / total) * 100;
            const currentOffset = offset;
            offset += percentage;
            return <circle cx="60" cy="60" fill="none" key={row.label} pathLength="100" r="45" stroke={row.color} strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={-currentOffset} strokeWidth="18" />;
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <b className="text-3xl font-black sm:text-4xl">{showValue ? formatMoney(total) : formatCompact(total)}</b>
          <span className="mt-1 text-sm font-semibold text-[var(--muted)] sm:text-base">{showValue ? "มูลค่ารวม" : "จำนวนรวม"}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => <div className="grid grid-cols-[10px_minmax(0,1fr)] gap-x-2" key={row.label}>
          <i className="mt-1.5 size-2.5 rounded-full" style={{ backgroundColor: row.color } as CSSProperties} />
          <div className="min-w-0"><p className="truncate text-sm font-extrabold">{row.label}</p><p className="text-xs text-[var(--muted)]">{row.detail} · {formatPercent(row.value / total)}</p></div>
        </div>)}
      </div>
    </div>
  );
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.slice(0, -1).reduce((path, point, index) => {
    const previous = points[index - 1] ?? point;
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const minimumY = Math.min(point.y, next.y);
    const maximumY = Math.max(point.y, next.y);
    const control1X = point.x + (next.x - previous.x) / 4;
    const control1Y = clamp(point.y + (next.y - previous.y) / 4, minimumY, maximumY);
    const control2X = next.x - (afterNext.x - point.x) / 4;
    const control2Y = clamp(next.y - (afterNext.y - point.y) / 4, minimumY, maximumY);
    return `${path} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}
const previousValueLabels: Record<StoreTrendMode, string> = {
  threeMonths: "มูลค่า 3 เดือนก่อนหน้า (บาท)",
  day: "มูลค่าวันก่อน (บาท)",
  week: "มูลค่าสัปดาห์ก่อน (บาท)",
  month: "มูลค่าเดือนก่อน (บาท)",
  year: "มูลค่าปีก่อน (บาท)",
};
const previousQuantityLabels: Record<StoreTrendMode, string> = {
  threeMonths: "จำนวน 3 เดือนก่อนหน้า",
  day: "จำนวนวันก่อน",
  week: "จำนวนสัปดาห์ก่อน",
  month: "จำนวนเดือนก่อน",
  year: "จำนวนปีก่อน",
};
const trendSmoothingRadius: Record<StoreTrendMode, number> = {
  threeMonths: 14,
  day: 4,
  week: 1,
  month: 5,
  year: 5,
};
function smoothValues(values: number[], radius: number) {
  if (radius <= 0 || values.length < 3) return values;
  const sigma = Math.max(1, radius / 2.4);
  return values.map((_, index) => {
    let weightedTotal = 0;
    let totalWeight = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const sourceIndex = index + offset;
      if (sourceIndex < 0 || sourceIndex >= values.length) continue;
      const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
      weightedTotal += values[sourceIndex] * weight;
      totalWeight += weight;
    }
    return totalWeight ? weightedTotal / totalWeight : values[index];
  });
}
function clamp(value: number, minimum: number, maximum: number) { return Math.max(minimum, Math.min(maximum, value)); }
function niceMaximum(value: number) { const magnitude = 10 ** Math.floor(Math.log10(value)); return Math.ceil(value / magnitude) * magnitude; }
function tooltipX(pointX: number, width: number) { return Math.max(4, Math.min(width - 180, pointX - 88)); }
function ChartEmpty({ text }: { text: string }) { return <div className="grid min-h-64 place-items-center rounded-2xl bg-[var(--soft)] text-center text-sm font-semibold text-[var(--muted)]">{text}</div>; }
function formatCompact(value: number) { return new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function formatMoney(value: number) { return `฿${new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`; }
function formatMoneyFull(value: number) { return `฿${new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`; }
function formatNumber(value: number) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value); }
function formatPercent(value: number) { return new Intl.NumberFormat("th-TH", { style: "percent", maximumFractionDigits: 1 }).format(value); }
