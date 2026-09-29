import { Gauge } from "lucide-react";
import { UnreadBadge } from "../../components/unread-badge";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { WorkStatus, statusLabels } from "../../modules/cm-work/cm-work-types";
import type {
  ChartRow,
  MonthlyTrendRow,
} from "../../modules/dashboard/dashboard-chart-data";
import { dashboardStatusColors as statusColors } from "../../modules/dashboard/dashboard-page-model";
import type { NotificationGroup } from "../../modules/notifications/notification-types";

const activeBreakdownStatuses = new Set<WorkStatus>([
  WorkStatus.WAITING_TO_CLAIM,
  WorkStatus.CLAIMED,
  WorkStatus.IN_PROGRESS,
  WorkStatus.BACKLOG_SHUTDOWN,
  WorkStatus.WAITING_TO_CLOSE,
  WorkStatus.RETURNED_FOR_CORRECTION,
]);

export function KpiCard({
  href,
  group,
  unreadCount,
  readAction,
  label,
  value,
  note,
  icon,
  color,
}: {
  href: string;
  group: NotificationGroup;
  unreadCount: number;
  readAction: (formData: FormData) => void | Promise<void>;
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <form
      action={readAction}
      className="dashboard-kpi-slide relative h-full min-w-0 overflow-visible"
    >
      <input name="group" type="hidden" value={group} />
      <input name="href" type="hidden" value={href} />
      <button
        type="submit"
        className="dashboard-kpi relative block min-h-[148px] h-full w-full min-w-0 overflow-hidden rounded-2xl border border-[var(--line)] p-3 text-left text-[var(--ink)] shadow-[var(--shadow)] transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] sm:min-h-0 sm:p-5"
        style={{ "--kpi-color": color } as React.CSSProperties}
        aria-label={`KPI ${label}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold leading-tight text-[var(--muted)] sm:text-sm">
              {label}
            </p>
            <strong className="mt-2 block text-3xl leading-none sm:text-4xl">
              {value}
            </strong>
          </div>
          <div className="dashboard-kpi-icon origin-top-right scale-75 sm:scale-100">
            {icon}
          </div>
        </div>
        <p className="mt-4 text-xs leading-snug text-[var(--muted)] sm:text-sm">
          {note}
        </p>
      </button>
      <UnreadBadge count={unreadCount} position="cardEdge" />
    </form>
  );
}

export function Panel({
  title,
  icon,
  aside,
  tone = "blue",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  aside: string;
  tone?: "blue" | "mint" | "amber" | "rose" | "violet" | "slate";
  children: React.ReactNode;
}) {
  return (
    <section className={`dashboard-panel ops-panel cm-panel-${tone} flex h-full min-w-0 flex-col rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-3 text-xl font-bold sm:text-2xl">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        <span className="shrink-0 text-sm text-[var(--muted)]">{aside}</span>
      </div>
      {children}
    </section>
  );
}

type YesterdayDashboardReport = {
  date: string;
  rows: Array<{
    categoryId: string;
    categoryName: string;
    newCount: number;
    inProcessCount: number;
    closedCount: number;
  }>;
  totals: {
    newCount: number;
    inProcessCount: number;
    closedCount: number;
  };
};

const dashboardDateFormatter = new Intl.DateTimeFormat(
  "th-TH-u-ca-buddhist-nu-latn",
  {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
);

export function formatDashboardIsoDate(date: string) {
  return dashboardDateFormatter.format(new Date(`${date}T00:00:00+07:00`));
}

export function getPreviousDashboardDate(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day) - 1,
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export function buildWorkHref(
  categoryParam: string,
  filters: { status?: WorkStatus; statusGroup?: string } = {},
) {
  const params = new URLSearchParams(categoryParam);
  if (filters.status) params.set("status", filters.status);
  if (filters.statusGroup) params.set("statusGroup", filters.statusGroup);
  const query = params.toString();
  return query ? `/work?${query}` : "/work";
}

export function StatusOverviewContent({
  rows,
  total,
}: {
  rows: { status: WorkStatus; label: string; value: number; color: string }[];
  total: number;
}) {
  const visibleRows = rows.filter((row) => row.value > 0);
  const legendRows = visibleRows.length ? visibleRows : rows;
  const activeRows = rows.filter((row) =>
    activeBreakdownStatuses.has(row.status),
  );
  const activeTotal = activeRows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col sm:min-h-[470px]">
      <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,5fr)_minmax(200px,2fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl bg-[var(--soft)]/55 p-3 text-center">
          <h3 className="text-sm font-extrabold">สถานะทั้งหมด</h3>
          <Donut
            variant="overviewPrimary"
            rows={rows}
            total={total}
            centerLabel="Total CM"
          />
        </div>
        <div className="min-w-0 overflow-hidden rounded-2xl bg-[var(--soft)]/55 p-3 text-center">
          <h3 className="text-xs font-extrabold">งานที่ยังต้องดำเนินการ</h3>
          <Donut
            variant="overviewSecondary"
            rows={activeRows}
            total={activeTotal}
            centerLabel="Active Work"
          />
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 pt-2 md:grid-cols-4">
        {legendRows.map((row, index) => {
          const percent =
            total === 0 ? 0 : Math.round((row.value / total) * 100);
          return (
            <div key={`${row.label}-${index}`} className="min-w-0 text-xs">
              <div className="flex min-w-0 items-center gap-2 font-semibold text-[var(--muted)]">
                <i
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="min-w-0 truncate">{row.label}</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-2 pl-[18px] tabular-nums">
                <strong className="text-sm font-black text-[var(--ink)]">
                  {row.value} งาน
                </strong>
                <span className="font-bold text-[var(--muted)]">
                  {percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function YesterdayCategoryReport({
  report,
}: {
  report: YesterdayDashboardReport;
}) {
  const rows = report.rows
    .map((row) => ({
      ...row,
      total: row.newCount + row.inProcessCount + row.closedCount,
    }))
    .sort(
      (a, b) =>
        b.total - a.total || a.categoryName.localeCompare(b.categoryName),
    );
  const visibleRows = rows.filter((row) => row.total > 0);
  const hasData = visibleRows.length > 0;

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <YesterdayMetric
          label="แจ้งใหม่"
          value={report.totals.newCount}
          color="#3b82f6"
        />
        <YesterdayMetric
          label="กำลังดำเนินการ"
          value={report.totals.inProcessCount}
          color="#14b8a6"
        />
        <YesterdayMetric
          label="ปิดงาน"
          value={report.totals.closedCount}
          color="#22c55e"
        />
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3">
        {hasData ? (
          <div className="grid gap-2">
            {visibleRows.map((row) => (
              <div
                key={row.categoryId}
                className="rounded-xl bg-[var(--surface)] px-3 py-2 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="truncate text-sm">
                    {row.categoryName}
                  </strong>
                  <span className="rounded-full bg-[var(--soft)] px-2.5 py-1 text-xs font-black">
                    {row.total} งาน
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-semibold text-[var(--muted)]">
                  <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-blue-600">
                    ใหม่ {row.newCount}
                  </span>
                  <span className="rounded-lg bg-teal-500/10 px-2 py-1 text-teal-600">
                    ดำเนินการ {row.inProcessCount}
                  </span>
                  <span className="rounded-lg bg-green-500/10 px-2 py-1 text-green-600">
                    ปิด {row.closedCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-[var(--surface)] p-4 text-center text-sm font-semibold text-[var(--muted)]">
            ไม่มีงานในรายงานเมื่อวาน
          </p>
        )}
      </div>
    </div>
  );
}

function YesterdayMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3">
      <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
      <strong className="mt-1 block text-3xl tabular-nums" style={{ color }}>
        {value}
      </strong>
    </div>
  );
}

function Donut({
  rows,
  total,
  centerLabel,
  variant = "default",
}: {
  rows: { label: string; value: number; color: string }[];
  total: number;
  centerLabel: string;
  variant?: "default" | "overviewPrimary" | "overviewSecondary";
}) {
  const size = 260;
  const center = size / 2;
  const radius = variant === "overviewPrimary" ? 96 : 86;
  const strokeWidth = 30;
  const circumference = 2 * Math.PI * radius;
  const gap = 5;
  let offset = 0;
  const segments = rows
    .filter((row) => row.value > 0)
    .map((row) => {
      const segmentLength = (row.value / Math.max(total, 1)) * circumference;
      const dashLength = Math.max(1, segmentLength - gap);
      const segment = {
        ...row,
        dashArray: `${dashLength} ${circumference - dashLength}`,
        dashOffset: -offset,
      };
      offset += segmentLength;
      return segment;
    });
  const sizeClass =
    variant === "overviewPrimary"
      ? "aspect-square h-auto w-full max-w-[280px] min-[430px]:max-w-[320px] sm:max-w-[400px]"
      : variant === "overviewSecondary"
        ? "aspect-square h-auto w-full max-w-[190px] sm:max-w-[200px]"
        : "h-[340px] w-[340px] sm:h-[500px] sm:w-[500px] xl:h-[560px] xl:w-[560px]";
  const valueClass =
    variant === "overviewPrimary"
      ? "text-5xl"
      : variant === "overviewSecondary"
        ? "text-3xl"
        : "text-5xl sm:text-6xl";
  const labelClass = "text-sm";
  const widthConstraintClass = variant === "default" ? "max-w-full" : "";
  const alignmentClass =
    variant === "overviewPrimary"
      ? "mx-auto sm:-ml-6 sm:mr-auto"
      : variant === "overviewSecondary"
        ? "mx-auto sm:-mr-4 sm:ml-auto"
        : "mx-auto";

  return (
    <div
      className={`cm-donut-motion relative grid place-items-center ${alignmentClass} ${widthConstraintClass} ${sizeClass}`}
    >
      <svg
        aria-hidden="true"
        className="h-full w-full -rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke="var(--soft)"
          strokeWidth={strokeWidth}
        />
        {segments.length ? (
          segments.map((segment, index) => (
            <circle
              key={`${segment.label}-${index}`}
              cx={center}
              cy={center}
              fill="none"
              r={radius}
              stroke={segment.color}
              strokeDasharray={segment.dashArray}
              strokeDashoffset={segment.dashOffset}
              strokeLinecap="butt"
              strokeWidth={strokeWidth}
            />
          ))
        ) : (
          <circle
            cx={center}
            cy={center}
            fill="none"
            r={radius}
            stroke="var(--line)"
            strokeDasharray={`${circumference - gap} ${gap}`}
            strokeWidth={strokeWidth}
          />
        )}
      </svg>
      <div className="absolute inset-0 z-10 grid place-items-center text-center">
        <span className="cm-donut-core">
          <small
            className={`block font-semibold text-[var(--muted)] ${labelClass}`}
          >
            {centerLabel}
          </small>
          <strong className={`block font-black ${valueClass}`}>{total}</strong>
        </span>
      </div>
    </div>
  );
}

function Legend({
  rows,
  total,
}: {
  rows: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[260px] gap-1.5 lg:mx-0 lg:max-w-[230px] lg:justify-self-end">
      {rows.map((row, index) => (
        <div
          key={`${row.label}-${index}`}
          className="flex items-center justify-between gap-2 rounded-xl bg-[var(--soft)] px-2.5 py-1.5 text-sm"
        >
          <span className="flex min-w-0 items-center gap-2">
            <i
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
            />
            <span className="truncate">{row.label}</span>
          </span>
          <strong className="shrink-0 text-sm font-bold tabular-nums">
            {row.value} -{" "}
            {total === 0 ? 0 : Math.round((row.value / total) * 100)}%
          </strong>
        </div>
      ))}
    </div>
  );
}

export function MonthlyTrendPanel({ rows }: { rows: MonthlyTrendRow[] }) {
  const max = Math.max(
    1,
    ...rows.flatMap((row) => [
      getStatusCount(row, WorkStatus.NEW),
      getFollowUpStatusTotal(row),
    ]),
  );
  const axisMax = Math.max(1, Math.ceil(max / 10) * 10);
  const axisLabels = Array.from({ length: 6 }, (_, index) =>
    Math.round(axisMax - (axisMax / 5) * index),
  );
  const legendStatuses = [
    WorkStatus.NEW,
    WorkStatus.WAITING_TO_CLAIM,
    WorkStatus.CLAIMED,
    WorkStatus.IN_PROGRESS,
    WorkStatus.BACKLOG_SHUTDOWN,
    WorkStatus.WAITING_TO_CLOSE,
    WorkStatus.RETURNED_FOR_CORRECTION,
    WorkStatus.CLOSED,
    WorkStatus.CANCELED,
  ];

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 text-[11px] text-[var(--muted)] sm:justify-end sm:text-xs">
        {legendStatuses.map((status) => (
          <LegendKey
            key={status}
            color={statusColors[status]}
            label={statusLabels[status]}
          />
        ))}
      </div>
      <div className="mt-4 overflow-visible rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 pb-4 pt-5 sm:px-5">
        <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-2 sm:grid-cols-[42px_minmax(0,1fr)] sm:gap-3">
          <div className="grid h-[500px] grid-rows-6 pb-12 pt-3 text-right text-[11px] font-semibold text-[var(--muted)]">
            {axisLabels.map((label, index) => (
              <span key={`${label}-${index}`}>{label}</span>
            ))}
          </div>
          <div className="relative">
            <div
              className="absolute inset-x-0 top-3 bottom-12 grid grid-rows-5"
              aria-hidden="true"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={index} className="border-t border-[var(--line)]" />
              ))}
            </div>
            <div
              className="monthly-trend-grid relative z-10 grid h-[500px] items-end gap-2 sm:gap-3"
              style={
                {
                  "--month-count": Math.max(rows.length, 1),
                } as React.CSSProperties
              }
            >
              {rows.map((row, index) => (
                <MonthlyBar
                  key={row.key}
                  row={row}
                  max={axisMax}
                  index={index}
                  hiddenOnMobile={index < rows.length - 3}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function MonthlyBar({
  row,
  max,
  index,
  hiddenOnMobile,
}: {
  row: MonthlyTrendRow;
  max: number;
  index: number;
  hiddenOnMobile?: boolean;
}) {
  const followUpStatuses = [
    WorkStatus.WAITING_TO_CLAIM,
    WorkStatus.CLAIMED,
    WorkStatus.IN_PROGRESS,
    WorkStatus.BACKLOG_SHUTDOWN,
    WorkStatus.WAITING_TO_CLOSE,
    WorkStatus.RETURNED_FOR_CORRECTION,
    WorkStatus.CLOSED,
    WorkStatus.CANCELED,
  ];
  const newCount = getStatusCount(row, WorkStatus.NEW);
  const followUpTotal = getFollowUpStatusTotal(row);
  const maxHeight = 430;
  const newHeight =
    newCount === 0
      ? 12
      : Math.max(24, Math.round((newCount / max) * maxHeight));
  const followUpHeight =
    followUpTotal === 0
      ? 12
      : Math.max(24, Math.round((followUpTotal / max) * maxHeight));
  const tooltipRows = [WorkStatus.NEW, ...followUpStatuses]
    .map((status) => ({
      label: statusLabels[status],
      value: getStatusCount(row, status),
      color: statusColors[status],
    }))
    .filter((item) => item.value > 0);

  return (
    <div
      aria-label={`${row.label}: แจ้งใหม่ ${newCount}, งานต่อเนื่อง ${followUpTotal}, รวม ${row.total}`}
      className={`group relative h-[500px] min-w-0 grid-rows-[1fr_auto_auto] items-end gap-1.5 text-center outline-none ${hiddenOnMobile ? "hidden md:grid" : "grid"}`}
      role="img"
      tabIndex={0}
    >
      <div className="pointer-events-none absolute right-0 top-8 z-30 w-60 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-left text-xs opacity-0 shadow-xl transition duration-200 group-hover:opacity-100 group-focus:opacity-100">
        <p className="font-black text-[var(--ink)]">{row.label}</p>
        <p className="mt-1 text-[var(--muted)]">Total {row.total} jobs</p>
        <div className="mt-3 grid gap-1.5">
          {tooltipRows.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <i
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.label}</span>
              </span>
              <strong className="tabular-nums">{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto grid h-[452px] w-full grid-cols-[minmax(22px,34px)_minmax(22px,34px)] items-end justify-center gap-2 pb-0 sm:grid-cols-[30px_30px] sm:gap-3 xl:grid-cols-[34px_34px]">
        <span
          className="cm-monthly-bar flex w-full overflow-hidden rounded-t-md bg-[var(--line)]"
          style={
            {
              height: newHeight,
              "--cm-delay": `${index * 90}ms`,
            } as React.CSSProperties
          }
        >
          <i
            className="block h-full w-full"
            style={{ backgroundColor: statusColors[WorkStatus.NEW] }}
          />
        </span>
        <span
          className="cm-monthly-bar flex w-full flex-col-reverse overflow-hidden rounded-t-md bg-[var(--line)]"
          style={
            {
              height: followUpHeight,
              "--cm-delay": `${index * 90 + 70}ms`,
            } as React.CSSProperties
          }
        >
          {followUpStatuses.map((status) => {
            const count = getStatusCount(row, status);
            if (count === 0) return null;
            return (
              <i
                key={status}
                className="block"
                style={{
                  flexGrow: count,
                  backgroundColor: statusColors[status],
                }}
              />
            );
          })}
        </span>
      </div>
      <strong className="text-xs">
        {newCount} / {followUpTotal}
      </strong>
      <span className="whitespace-nowrap text-[10px] text-[var(--muted)] sm:text-xs">
        {row.label}
      </span>
    </div>
  );
}

function getStatusCount(row: MonthlyTrendRow, status: WorkStatus) {
  return row.statusCounts?.[status] ?? 0;
}

function getFollowUpStatusTotal(row: MonthlyTrendRow) {
  return (
    getStatusCount(row, WorkStatus.WAITING_TO_CLAIM) +
    getStatusCount(row, WorkStatus.CLAIMED) +
    getStatusCount(row, WorkStatus.IN_PROGRESS) +
    getStatusCount(row, WorkStatus.BACKLOG_SHUTDOWN) +
    getStatusCount(row, WorkStatus.WAITING_TO_CLOSE) +
    getStatusCount(row, WorkStatus.RETURNED_FOR_CORRECTION) +
    getStatusCount(row, WorkStatus.CLOSED) +
    getStatusCount(row, WorkStatus.CANCELED)
  );
}

type StatusDateInput = {
  status: string;
  createdAt: Date;
  claimedAt: Date | null;
  inProgressAt: Date | null;
  waitingToCloseAt: Date | null;
  closedAt: Date | null;
  canceledAt: Date | null;
  statusHistory: { changedAt: Date }[];
};

export function getStatusDate(work: StatusDateInput) {
  switch (work.status) {
    case WorkStatus.NEW:
      return work.createdAt;
    case WorkStatus.CLAIMED:
      return (
        work.claimedAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt
      );
    case WorkStatus.IN_PROGRESS:
      return (
        work.inProgressAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt
      );
    case WorkStatus.BACKLOG_SHUTDOWN:
      return (
        work.statusHistory[0]?.changedAt ?? work.inProgressAt ?? work.createdAt
      );
    case WorkStatus.WAITING_TO_CLOSE:
      return (
        work.waitingToCloseAt ??
        work.statusHistory[0]?.changedAt ??
        work.createdAt
      );
    case WorkStatus.CLOSED:
      return (
        work.closedAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt
      );
    case WorkStatus.CANCELED:
      return (
        work.canceledAt ?? work.statusHistory[0]?.changedAt ?? work.createdAt
      );
    case WorkStatus.WAITING_TO_CLAIM:
    case WorkStatus.RETURNED_FOR_CORRECTION:
    default:
      return work.statusHistory[0]?.changedAt ?? work.createdAt;
  }
}

export function formatStatusDate(date: Date) {
  return formatThaiDateTime(date);
}

export function ZoneBar({ row, color }: { row: ChartRow; color: string }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold">{row.label}</span>
        <strong>{row.count}</strong>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-[var(--soft)]">
        <div
          className="cm-zone-fill h-full rounded-full"
          style={{ width: `${row.percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function MiniPanel({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note: string;
  color: string;
}) {
  return (
    <section className="dashboard-glass-card rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">{label}</p>
        <Gauge size={20} style={{ color }} />
      </div>
      <strong className="mt-4 block text-4xl" style={{ color }}>
        {value}
      </strong>
      <p className="mt-2 text-sm text-[var(--muted)]">{note}</p>
    </section>
  );
}
