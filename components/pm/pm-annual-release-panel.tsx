import { PreserveListPositionForm } from "../preserve-list-position";

type ReleasePreview = {
  scheduleDateKey: string;
  schedules: Array<{
    id: string;
    assetSystem?: { code: string; nameTh: string } | null;
    zone?: { name: string } | null;
  }>;
  workload: { count: number; threshold: number; warning: boolean };
};

export function PmAnnualReleasePanel({
  action,
  organizationId,
  plantId,
  planId,
  preview,
  positionKey,
  calendarView = "month",
  activatesDraft = false,
}: {
  action: (data: FormData) => void | Promise<void>;
  organizationId: string;
  plantId: string;
  planId: string;
  preview: ReleasePreview;
  positionKey: string;
  calendarView?: "month" | "day";
  activatesDraft?: boolean;
}) {
  const primaryTarget = targetLabel(preview.schedules[0]);
  const extraTargetCount = Math.max(0, preview.schedules.length - 1);

  return (
    <section data-pm-annual-release-card>
      <div
        className="flex min-h-16 items-center justify-between gap-3 rounded-full bg-[#ff6a1a] pl-6 text-slate-950 shadow-[0_12px_28px_rgba(249,115,22,0.24)]"
        data-pm-release-target-bar
      >
        <strong className="min-w-0 truncate text-xl font-medium sm:text-2xl">
          {primaryTarget}
          {extraTargetCount ? ` +${extraTargetCount}` : ""}
        </strong>
        <span
          className={`grid min-h-16 min-w-16 shrink-0 place-items-center rounded-full px-3 text-lg font-extrabold ${preview.workload.warning ? "bg-amber-200 text-amber-950" : "bg-[#ffd9c2] text-slate-950"}`}
        >
          {preview.workload.count}
        </span>
      </div>

      <PreserveListPositionForm
        action={action}
        className="mt-5 grid gap-4"
        storageKey={positionKey}
        targetId={`pm-release-${preview.scheduleDateKey}`}
      >
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="plantId" type="hidden" value={plantId} />
        <input name="annualPlanId" type="hidden" value={planId} />
        <input name="releaseDateKey" type="hidden" value={preview.scheduleDateKey} />
        <input name="calendarView" type="hidden" value={calendarView} />

        {activatesDraft ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            Annual PM Plan นี้ยังเป็น Draft การเริ่มดำเนินการ PM จะ Activate แผนก่อนสร้าง PM Work
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4 px-2">
          <div className="flex min-w-0 items-center" aria-label="เป้าหมาย Annual PM">
            {preview.schedules.slice(0, 3).map((row, index) => (
              <span
                className={`${index ? "-ml-3" : ""} grid size-12 shrink-0 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-sky-100 to-blue-300 text-sm font-black text-blue-950 shadow-md`}
                key={row.id}
                title={targetLabel(row)}
              >
                {targetInitial(row)}
              </span>
            ))}
            {preview.schedules.length > 3 ? (
              <span className="-ml-3 grid size-12 shrink-0 place-items-center rounded-full border-4 border-white bg-blue-200 text-sm font-black text-blue-950 shadow-md">
                +{preview.schedules.length - 3}
              </span>
            ) : null}
          </div>
          <time
            className="shrink-0 text-lg font-semibold tabular-nums sm:text-xl"
            dateTime={preview.scheduleDateKey}
          >
            {formatDateKey(preview.scheduleDateKey)}
          </time>
        </div>

        <div className="flex flex-wrap gap-2 px-2">
          {preview.schedules.map((row) => (
            <span className="rounded-full bg-cyan-100 px-4 py-1 text-sm font-semibold text-cyan-950" key={row.id}>
              <input name="releaseScheduleIds" type="hidden" value={row.id} />
              {targetLabel(row)}
            </span>
          ))}
        </div>

        <p className="sr-only">สร้าง PM Work สำหรับ Main Assets ทั้งหมดในรายการ</p>

        <button
          className="mx-auto mt-1 min-h-16 w-full rounded-full bg-emerald-500 px-7 text-2xl font-black text-slate-950 shadow-[0_12px_28px_rgba(16,185,129,0.22)] transition hover:-translate-y-0.5 hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200 sm:w-3/4 sm:text-3xl"
          type="submit"
        >
          เริ่ม PM
        </button>
      </PreserveListPositionForm>
    </section>
  );
}

function targetLabel(row: ReleasePreview["schedules"][number] | undefined) {
  if (!row) return "Annual PM";
  return row.assetSystem
    ? `${row.assetSystem.code} · ${row.assetSystem.nameTh}`
    : row.zone?.name ?? "Annual PM";
}

function targetInitial(row: ReleasePreview["schedules"][number]) {
  const value = row.assetSystem?.code ?? row.zone?.name ?? "PM";
  return value.trim().slice(0, 2).toUpperCase();
}

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return year && month && day ? `${day}/${month}/${year}` : dateKey;
}
