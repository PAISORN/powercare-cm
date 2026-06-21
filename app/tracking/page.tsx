import { CheckCircle2, ClipboardCheck, ClipboardList, Search, Wrench, XCircle } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { PublicHeader } from "../../components/public-header";
import { StatusBadge } from "../../components/status-badge";
import { db } from "../../lib/db";
import { formatThaiDateTime as formatThaiDate } from "../../lib/date-time/bangkok-time";
import { getCurrentUser } from "../../lib/session";
import { WorkStatus, statusLabels, urgencyLabels, type Urgency } from "../../modules/cm-work/cm-work-types";

const trackingSteps: { label: string; statuses: WorkStatus[]; icon: typeof ClipboardList }[] = [
  { label: "รับเข้าระบบ", statuses: [WorkStatus.NEW], icon: ClipboardList },
  { label: "ระหว่างดำเนินการ", statuses: [WorkStatus.WAITING_TO_CLAIM, WorkStatus.CLAIMED, WorkStatus.IN_PROGRESS], icon: Wrench },
  { label: "รอตรวจรับ/ปิดงาน", statuses: [WorkStatus.WAITING_TO_CLOSE, WorkStatus.RETURNED_FOR_CORRECTION], icon: ClipboardCheck },
  { label: "ปิดงานสำเร็จ", statuses: [WorkStatus.CLOSED], icon: CheckCircle2 },
];

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ number?: string }> }) {
  const user = await getCurrentUser();
  const { number: rawNumber } = await searchParams;
  const number = rawNumber?.trim();
  const work = number
    ? await db.cmWork.findUnique({
        where: { number },
        include: {
          category: true,
          zone: true,
          claimant: true,
          reviewer: true,
          statusHistory: { orderBy: { changedAt: "asc" } },
        },
      })
    : null;
  const actorIds = [...new Set(work?.statusHistory.map((item) => item.changedById).filter((id): id is string => Boolean(id)) ?? [])];
  const actors = actorIds.length ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } }) : [];
  const actorNameById = new Map(actors.map((actor) => [actor.id, actor.fullName]));

  return (
    <TrackingShell signedIn={Boolean(user)}>
      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
                <Search size={16} />
                CM Tracking
              </p>
              <h1 className="mt-4 text-3xl font-extrabold">ติดตามสถานะงานซ่อม</h1>
              <p className="mt-2 text-[var(--muted)]">กรอกเลขที่แจ้งซ่อมเพื่อดูขั้นตอนและประวัติการดำเนินงานแบบ timeline</p>
            </div>
            {work ? (
              <div className="rounded-2xl bg-[var(--soft)] px-4 py-3 text-right">
                <p className="text-sm text-[var(--muted)]">เลขที่แจ้งซ่อม</p>
                <strong className="block text-xl">{work.number}</strong>
              </div>
            ) : null}
          </div>

          <form className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
            <input name="number" defaultValue={number} placeholder="CM-2026-06-0001" className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 text-[var(--ink)]" />
            <button className="rounded-2xl bg-[var(--primary)] px-6 py-4 font-bold text-white shadow-sm">ค้นหา</button>
          </form>
        </section>

        {number && !work ? (
          <p className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center text-[var(--muted)] shadow-[var(--shadow)]">ไม่พบเลขที่แจ้งซ่อมนี้</p>
        ) : null}

        {work ? (
          <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:p-7">
            <div className="grid gap-5 xl:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-[var(--muted)]">สถานะล่าสุด</p>
                <h2 className="mt-1 text-3xl font-extrabold text-[var(--primary)]">{statusLabels[work.status as WorkStatus]}</h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {work.problemTitle} · {work.machineName}
                </p>
              </div>
              <div className="grid gap-1 text-sm xl:text-right">
                <p>
                  <strong>Category:</strong> {work.category.name}
                </p>
                <p>
                  <strong>Zone:</strong> {work.zone.name}
                </p>
                <p>
                  <strong>ความเร่งด่วน:</strong> {urgencyLabels[work.urgency as Urgency]}
                </p>
                <p>
                  <strong>ผู้รับงาน:</strong> {work.claimant?.fullName ?? "-"}
                </p>
              </div>
            </div>

            <TrackingStepper status={work.status as WorkStatus} />

            <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
                <h3 className="text-lg font-bold">รายละเอียดงาน</h3>
                <dl className="mt-4 grid gap-3 text-sm">
                  <InfoRow label="ผู้แจ้ง" value={`${work.requesterName} · ${work.requesterDepartment}`} />
                  <InfoRow label="วันที่แจ้ง" value={formatThaiDate(work.createdAt)} />
                  <InfoRow label="ชื่อเครื่องจักร" value={work.machineName} />
                  <InfoRow label="รายละเอียด" value={work.problemDetail} />
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-bold">ประวัติสถานะ</h3>
                <div className="mt-4 grid gap-0">
                  {work.statusHistory.map((event, index) => (
                    <TimelineRow
                      key={event.id}
                      active={index === work.statusHistory.length - 1}
                      actor={event.changedById ? (actorNameById.get(event.changedById) ?? "ผู้ใช้งาน") : "ระบบ"}
                      note={event.note}
                      time={event.changedAt}
                      title={statusLabels[event.toStatus as WorkStatus] ?? event.toStatus}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </section>
    </TrackingShell>
  );
}

function TrackingShell({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  if (signedIn) return <AppShell>{children}</AppShell>;

  return (
    <main>
      <PublicHeader />
      {children}
    </main>
  );
}

function TrackingStepper({ status }: { status: WorkStatus }) {
  const currentIndex = status === WorkStatus.CANCELED ? -1 : trackingSteps.findIndex((step) => step.statuses.includes(status));

  return (
    <div className="mt-8 grid grid-cols-4 gap-1 sm:gap-2 md:gap-0">
      {trackingSteps.map((step, index) => {
        const Icon = step.icon;
        const completed = currentIndex >= index;
        const current = currentIndex === index;
        return (
          <div key={step.label} className="relative grid gap-1 text-center sm:gap-2 md:px-2">
            {index > 0 ? <span className={`absolute left-0 right-1/2 top-[22px] h-0.5 sm:top-7 sm:h-1 md:top-8 ${completed ? "bg-[#22c55e]" : "bg-[#ef4444]/45"}`} /> : null}
            {index < trackingSteps.length - 1 ? <span className={`absolute left-1/2 right-0 top-[22px] h-0.5 sm:top-7 sm:h-1 md:top-8 ${currentIndex > index ? "bg-[#22c55e]" : "bg-[#ef4444]/45"}`} /> : null}
            <span
              className={
                completed
                  ? "relative z-10 mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#22c55e] text-white shadow-sm sm:h-14 sm:w-14 md:h-16 md:w-16"
                  : current
                    ? "relative z-10 mx-auto grid h-11 w-11 place-items-center rounded-full bg-[var(--primary)] text-white shadow-sm sm:h-14 sm:w-14 md:h-16 md:w-16"
                    : "relative z-10 mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#ef4444] text-white shadow-sm sm:h-14 sm:w-14 md:h-16 md:w-16"
              }
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
            </span>
            <strong className="mx-auto max-w-[74px] text-[10px] font-bold leading-tight sm:max-w-[90px] sm:text-xs md:max-w-none md:text-sm">{step.label}</strong>
          </div>
        );
      })}
      {status === WorkStatus.CANCELED ? (
        <div className="col-span-4">
          <div className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
            <XCircle size={17} />
            งานนี้ถูกยกเลิก
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-[var(--muted)]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function TimelineRow({ title, actor, time, note, active }: { title: string; actor: string; time: Date; note?: string | null; active?: boolean }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <div className="grid justify-center">
        <span className={active ? "mt-1 h-4 w-4 rounded-full bg-[#22c55e]" : "mt-1 h-4 w-4 rounded-full border-2 border-[#22c55e] bg-[var(--surface)]"} />
        <span className="mx-auto h-full min-h-10 w-0.5 bg-[#22c55e]/45" />
      </div>
      <div className="pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{title}</strong>
          <span className="text-sm text-[var(--muted)]">{formatThaiDate(time)}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">โดย {actor}</p>
        {note ? <p className="mt-1 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{note}</p> : null}
      </div>
    </div>
  );
}
