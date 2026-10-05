import { PreserveListPositionForm } from "../preserve-list-position";
import { PmAnnualTeamPicker } from "./pm-annual-team-picker";

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
  users = [],
}: {
  action: (data: FormData) => void | Promise<void>;
  organizationId: string;
  plantId: string;
  planId: string;
  preview: ReleasePreview;
  positionKey: string;
  calendarView?: "month" | "day";
  activatesDraft?: boolean;
  users?: Array<{ id: string; fullName: string; role: string; hasPhoto?: boolean; photoVersion?: number }>;
}) {
  const primaryTarget = targetLabel(preview.schedules[0]);
  const extraTargetCount = Math.max(0, preview.schedules.length - 1);

  return (
    <section data-pm-annual-release-card>
      <div
        className="flex min-h-14 items-center justify-between gap-3 rounded-full bg-[#ff6a1a] pl-5 text-slate-950 shadow-[0_10px_24px_rgba(249,115,22,0.22)]"
        data-pm-release-target-bar
      >
        <strong className="min-w-0 truncate text-lg font-medium sm:text-xl">
          {primaryTarget}
          {extraTargetCount ? ` +${extraTargetCount}` : ""}
        </strong>
        <span
          className={`grid min-h-14 min-w-14 shrink-0 place-items-center rounded-full px-3 text-base font-extrabold ${preview.workload.warning ? "bg-amber-200 text-amber-950" : "bg-[#ffd9c2] text-slate-950"}`}
        >
          {preview.workload.count}
        </span>
      </div>

      <PreserveListPositionForm
        action={action}
        className="mt-4 grid gap-3"
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

        <PmAnnualTeamPicker
          dateLabel={formatDateKey(preview.scheduleDateKey)}
          dateTime={preview.scheduleDateKey}
          users={users}
        />

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
          className="mx-auto mt-1 min-h-14 w-full rounded-full bg-emerald-500 px-6 text-xl font-black text-slate-950 shadow-[0_10px_24px_rgba(16,185,129,0.20)] transition hover:-translate-y-0.5 hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200 sm:w-3/4 sm:text-2xl"
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

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return year && month && day ? `${day}/${month}/${year}` : dateKey;
}
