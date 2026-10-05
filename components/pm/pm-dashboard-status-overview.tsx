import { CircleDot } from "lucide-react";
import type { PmDashboardSummary } from "../../modules/pm/pm-dashboard-query";

type StatusOverview = PmDashboardSummary["statusOverview"];
type StatusRow = StatusOverview["rows"][number];

export function PmDashboardStatusOverview({
  overview,
}: {
  overview: StatusOverview;
}) {
  const visibleRows = overview.rows.filter((row) => row.value > 0);
  const legendRows = visibleRows.length ? visibleRows : overview.rows;

  return (
    <section className="dashboard-content-surface pm-pastel-surface flex h-full min-w-0 flex-col rounded-[2rem] border p-4 text-[#17213b] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-3 text-xl font-bold sm:text-2xl">
          <CircleDot aria-hidden="true" className="text-blue-500" size={22} />
          <span className="truncate">Status Overview</span>
        </h2>
        <span className="shrink-0 text-sm text-[var(--muted)]">
          Current year
        </span>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col sm:min-h-[470px]">
        <div className="mx-auto w-full max-w-md">
          <StatusDonut
            centerLabel="Total PM"
            rows={overview.rows}
            total={overview.total}
          />
        </div>

        <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3 pt-3 md:grid-cols-4">
          {legendRows.map((row) => {
            const percent = overview.total
              ? Math.round((row.value / overview.total) * 100)
              : 0;
            return (
              <div className="min-w-0 text-xs" key={row.status}>
                <div className="flex min-w-0 items-center gap-2 font-semibold text-[var(--muted)]">
                  <i
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
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
    </section>
  );
}

function StatusDonut({
  centerLabel,
  rows,
  total,
}: {
  centerLabel: string;
  rows: StatusRow[];
  total: number;
}) {
  const size = 260;
  const center = size / 2;
  const radius = 96;
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
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-[var(--soft)]/55 p-3 text-center">
      <h3 className="text-sm font-extrabold">สถานะทั้งหมด</h3>
      <div
        aria-label={`${centerLabel} ${total} งาน`}
        className="cm-donut-motion relative mx-auto grid aspect-square h-auto w-full max-w-[280px] place-items-center min-[430px]:max-w-[320px] sm:max-w-[360px]"
        role="img"
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
            segments.map((segment) => (
              <circle
                cx={center}
                cy={center}
                fill="none"
                key={segment.status}
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
        <span className="cm-donut-core absolute inset-0 z-10 grid place-content-center text-center">
          <small className="block text-sm font-semibold text-[var(--muted)]">
            {centerLabel}
          </small>
          <strong className="block text-5xl font-black">
            {total}
          </strong>
        </span>
      </div>
    </div>
  );
}
