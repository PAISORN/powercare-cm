import { CheckCircle2, ClipboardList, Database, History, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { formatThaiDateTime as formatThaiDate } from "../../../lib/date-time/bangkok-time";
import { requireUser } from "../../../lib/session";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

const actionLabels: Record<string, string> = {
  CREATE_USER: "เพิ่มผู้ใช้",
  CREATE_REPAIR_REQUEST: "สร้างใบแจ้งซ่อม",
  CREATE_CATEGORY: "เพิ่ม Category",
  DEACTIVATE_CATEGORY: "ปิดใช้งาน Category",
  CREATE_ZONE: "เพิ่ม Zone",
  DEACTIVATE_ZONE: "ปิดใช้งาน Zone",
  CLAIM_WORK: "รับงาน",
  START_WORK: "เริ่มดำเนินการ",
  SUBMIT_FOR_REVIEW: "ส่งตรวจรับ/ปิดงาน",
  RELEASE_WORK: "ปล่อยงานกลับไปรอรับ",
  RETURN_FOR_CORRECTION: "ส่งกลับให้แก้ไข",
  CLOSE_WORK: "ปิดงาน",
  CANCEL_WORK: "ยกเลิกงาน",
  UPDATE_USER_PROFILE: "แก้ไขข้อมูลผู้ใช้",
  DELETE_USER: "ลบผู้ใช้",
  UPDATE_ENGINEER_ASSIGNMENT_SETTING: "เปลี่ยนสิทธิ์การมอบหมายงานของวิศวกร",
  ASSIGN_WORK: "มอบหมายงานให้ช่าง",
  CREATE_ANNOUNCEMENT: "สร้างประกาศ",
  UPDATE_ANNOUNCEMENT: "แก้ไขประกาศ",
  ACTIVATE_ANNOUNCEMENT: "เปิดใช้งานประกาศ",
  DEACTIVATE_ANNOUNCEMENT: "ปิดใช้งานประกาศ",
  DELETE_ANNOUNCEMENT: "ลบประกาศ",
};

const processSteps = [
  { label: "Create", match: ["CREATE_REPAIR_REQUEST"], icon: ClipboardList },
  { label: "Work Action", match: ["CLAIM_WORK", "ASSIGN_WORK", "START_WORK", "RELEASE_WORK"], icon: UserRound },
  { label: "Review", match: ["SUBMIT_FOR_REVIEW", "RETURN_FOR_CORRECTION", "CLOSE_WORK"], icon: CheckCircle2 },
  { label: "Admin Record", match: ["CANCEL_WORK", "UPDATE_ENGINEER_ASSIGNMENT_SETTING", "CREATE_ANNOUNCEMENT", "UPDATE_ANNOUNCEMENT", "ACTIVATE_ANNOUNCEMENT", "DEACTIVATE_ANNOUNCEMENT", "DELETE_ANNOUNCEMENT"], icon: ShieldCheck },
];

export default async function AdminAuditPage() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const events = await db.auditEvent.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { actor: true, cmWork: true },
  });
  const actionCount = new Map<string, number>();
  events.forEach((event) => actionCount.set(event.action, (actionCount.get(event.action) ?? 0) + 1));

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
              <History size={16} />
              Back Office Timeline
            </p>
            <h1 className="mt-4 text-3xl font-extrabold">Audit Trail</h1>
            <p className="mt-2 text-[var(--muted)]">บันทึกเหตุการณ์หลังบ้าน เรียงตามเวลาล่าสุด สำหรับตรวจสอบการทำงานของระบบ</p>
          </div>
          <div className="rounded-2xl bg-[var(--soft)] px-4 py-3 text-right">
            <p className="text-sm text-[var(--muted)]">รายการล่าสุด</p>
            <strong className="block text-3xl">{events.length}</strong>
          </div>
        </div>

        <AuditStepper actionCount={actionCount} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Database size={21} className="text-[var(--primary)]" />
              Action Summary
            </h2>
            <span className="text-sm text-[var(--muted)]">{events.length} events</span>
          </div>
          <div className="mt-5 grid gap-3">
            {[...actionCount.entries()].map(([action, count]) => (
              <div key={action} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--soft)] px-4 py-3">
                <span className="font-semibold">{actionLabels[action] ?? action}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Event Timeline</h2>
            <span className="text-sm text-[var(--muted)]">ล่าสุดอยู่ด้านบน</span>
          </div>
          <div className="mt-5 grid gap-0">
            {events.map((event, index) => (
              <AuditTimelineRow
                key={event.id}
                action={actionLabels[event.action] ?? event.action}
                active={index === 0}
                actor={event.actor?.fullName ?? "System"}
                cmNumber={event.cmWork?.number ?? "-"}
                entity={event.entityType}
                reason={event.reason}
                time={event.createdAt}
              />
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function AuditStepper({ actionCount }: { actionCount: Map<string, number> }) {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-4 md:gap-0">
      {processSteps.map((step, index) => {
        const Icon = step.icon;
        const count = step.match.reduce((sum, action) => sum + (actionCount.get(action) ?? 0), 0);
        const active = count > 0;
        return (
          <div key={step.label} className="relative grid gap-2 text-center md:px-2">
            {index > 0 ? <span className={`absolute left-0 right-1/2 top-8 hidden h-1 md:block ${active ? "bg-[#22c55e]" : "bg-[#ef4444]/45"}`} /> : null}
            {index < processSteps.length - 1 ? <span className={`absolute left-1/2 right-0 top-8 hidden h-1 md:block ${active ? "bg-[#22c55e]" : "bg-[#ef4444]/45"}`} /> : null}
            <span className={active ? "relative z-10 mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#22c55e] text-white shadow-sm" : "relative z-10 mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#ef4444] text-white shadow-sm"}>
              <Icon size={28} />
            </span>
            <strong className="text-sm">{step.label}</strong>
            <span className="text-xs text-[var(--muted)]">{count} events</span>
          </div>
        );
      })}
    </div>
  );
}

function AuditTimelineRow({ action, actor, cmNumber, entity, reason, time, active }: { action: string; actor: string; cmNumber: string; entity: string; reason?: string | null; time: Date; active?: boolean }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <div className="grid justify-center">
        <span className={active ? "mt-1 h-4 w-4 rounded-full bg-[#22c55e]" : "mt-1 h-4 w-4 rounded-full border-2 border-[#22c55e] bg-[var(--surface)]"} />
        <span className="mx-auto h-full min-h-10 w-0.5 bg-[#22c55e]/45" />
      </div>
      <div className="pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{action}</strong>
          <span className="text-sm text-[var(--muted)]">{formatThaiDate(time)}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Actor: {actor} · CM: {cmNumber} · Entity: {entity}
        </p>
        {reason ? <p className="mt-1 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">Reason: {reason}</p> : null}
      </div>
    </div>
  );
}
