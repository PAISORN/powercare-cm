import type { ChartRow, MonthlyTrendRow } from "../modules/dashboard/dashboard-chart-data";

type HorizontalBarChartProps = {
  title: string;
  rows: ChartRow[];
};

type MonthlyTrendChartProps = {
  title: string;
  rows: MonthlyTrendRow[];
  caption?: string;
  square?: boolean;
};

export function HorizontalBarChart({ title, rows }: HorizontalBarChartProps) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]" aria-label={title}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-sm text-[var(--muted)]">{rows.reduce((sum, row) => sum + row.count, 0)} jobs</span>
      </div>
      <div className="mt-5 grid gap-4">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{row.label}</span>
              <strong>{row.count}</strong>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[var(--soft)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] shadow-sm"
                style={{ width: `${row.percentage}%` }}
                aria-label={`${row.label}: ${row.count}`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MonthlyTrendChart({ title, rows, caption, square = false }: MonthlyTrendChartProps) {
  const max = Math.max(0, ...rows.map((row) => row.total));
  const columnCount = Math.max(1, Math.min(rows.length, 6));

  return (
    <section
      className={`rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] ${square ? "aspect-square overflow-hidden" : ""}`}
      aria-label={title}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
          {caption ? <span className="rounded-full bg-[var(--soft)] px-3 py-1 font-semibold">{caption}</span> : null}
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" /> Total
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" /> Open
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" /> Pending
          </span>
          <span className="inline-flex items-center gap-1">
            <i className="h-2.5 w-2.5 rounded-full bg-[#14b8a6]" /> Other
          </span>
        </div>
      </div>
      <div
        className={`${square ? "mt-4 min-h-0" : "mt-5 min-h-60"} grid items-end gap-4`}
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(64px, 1fr))` }}
        role="img"
        aria-label="Monthly total and status mix bars"
      >
        {rows.map((row) => {
          const maxHeight = square ? 128 : 154;
          const totalHeight = max === 0 ? 8 : Math.max(8, Math.round((row.total / max) * maxHeight));
          const other = Math.max(0, row.total - row.open - row.pending);
          const segments = [
            { label: "open", value: row.open, color: "#f59e0b" },
            { label: "pending", value: row.pending, color: "#ef4444" },
            { label: "other", value: other, color: "#14b8a6" },
          ];
          return (
            <div key={row.key} className={`${square ? "h-44" : "h-60"} grid grid-rows-[1fr_auto_auto] items-end gap-2 text-center`}>
              <div className={`${square ? "h-36 w-20" : "h-44 w-24"} mx-auto grid grid-cols-[18px_18px] items-end justify-center gap-3 rounded-xl bg-[var(--soft)] px-3 pb-0`}>
                <div
                  className="w-[18px] rounded-t-md bg-[#2563eb]"
                  style={{ height: totalHeight }}
                  aria-label={`${row.label} total: ${row.total}`}
                />
                <div
                  className="flex w-[18px] flex-col-reverse overflow-hidden rounded-t-md bg-[var(--line)]"
                  style={{ height: totalHeight }}
                  aria-label={`${row.label} status mix: open ${row.open}, pending ${row.pending}, other ${other}`}
                >
                  {segments.map((segment) =>
                    row.total > 0 && segment.value > 0 ? (
                      <span
                        key={segment.label}
                        className="block"
                        style={{ height: `${(segment.value / row.total) * 100}%`, backgroundColor: segment.color }}
                      />
                    ) : null,
                  )}
                </div>
              </div>
              <strong className="text-xs">
                {row.total} / {row.open + row.pending + other}
              </strong>
              <span className="text-xs text-[var(--muted)]">{row.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
