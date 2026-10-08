import type { ReactNode } from "react";
import { formatThaiDateTime } from "../lib/date-time/bangkok-time";

export function ActivityTimelineRow({
  active,
  actor,
  detail,
  note,
  time,
  title,
}: {
  active: boolean;
  actor: string;
  detail?: ReactNode;
  note?: string | null;
  time: Date;
  title: string;
}) {
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
      <div className="grid justify-center">
        <span
          aria-label={active ? "รายการล่าสุด" : undefined}
          className={
            active
              ? "mt-1 h-4 w-4 rounded-full bg-emerald-500"
              : "mt-1 h-4 w-4 rounded-full border-2 border-emerald-500 bg-[var(--surface)]"
          }
        />
        <span
          aria-hidden="true"
          className="mx-auto h-full min-h-10 w-0.5 bg-emerald-500/45"
        />
      </div>
      <div className="min-w-0 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <strong>{title}</strong>
          <span className="shrink-0 text-sm text-[var(--muted)]">
            {formatThaiDateTime(time)}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">โดย {actor}</p>
        {detail ? <div className="mt-2">{detail}</div> : null}
        {note ? (
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
            {note}
          </p>
        ) : null}
      </div>
    </li>
  );
}
