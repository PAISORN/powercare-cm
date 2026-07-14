import { Database, History, PencilLine, PlusCircle, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { formatThaiDateTime as formatThaiDate } from "../../../lib/date-time/bangkok-time";
import { requireUser } from "../../../lib/session";
import { buildAuditEventScopeWhere } from "../../../modules/audit/audit-scope";
import { canViewPlantAuditLog } from "../../../modules/auth/permission";
import { formatRoleName } from "../../../modules/users/role-labels";

const trackedActions = [
  "CREATE_USER",
  "UPDATE_USER",
  "DELETE_USER",
  "CREATE_ORGANIZATION",
  "UPDATE_ORGANIZATION",
  "CREATE_SITE",
  "UPDATE_SITE",
  "ACTIVATE_SITE",
  "DEACTIVATE_SITE",
  "CREATE_CATEGORY",
  "UPDATE_CATEGORY",
  "ACTIVATE_CATEGORY",
  "DEACTIVATE_CATEGORY",
  "DELETE_CATEGORY",
  "CREATE_ZONE",
  "UPDATE_ZONE",
  "ACTIVATE_ZONE",
  "DEACTIVATE_ZONE",
  "DELETE_ZONE",
  "UPDATE_SLA_SETTING",
  "UPDATE_ENGINEER_ASSIGNMENT_SETTING",
  "CREATE_LINE_DESTINATION",
  "UPDATE_LINE_DESTINATION",
  "UPDATE_LINE_DAILY_REPORT_SETTING",
  "SEND_LINE_DAILY_REPORT_TEST",
];

const actionLabels: Record<string, string> = {
  CREATE_USER: "เพิ่มผู้ใช้งาน",
  UPDATE_USER: "แก้ไขผู้ใช้งาน",
  DELETE_USER: "ลบผู้ใช้งาน",
  CREATE_ORGANIZATION: "สร้าง Organization",
  UPDATE_ORGANIZATION: "แก้ไข Organization",
  CREATE_SITE: "สร้าง Site",
  UPDATE_SITE: "แก้ไข Site",
  ACTIVATE_SITE: "เปิดใช้งาน Site",
  DEACTIVATE_SITE: "ปิดใช้งาน Site",
  CREATE_CATEGORY: "เพิ่ม Category",
  UPDATE_CATEGORY: "แก้ไข Category",
  ACTIVATE_CATEGORY: "เปิดใช้งาน Category",
  DEACTIVATE_CATEGORY: "ปิดใช้งาน Category",
  DELETE_CATEGORY: "ลบ Category",
  CREATE_ZONE: "เพิ่ม Zone",
  UPDATE_ZONE: "แก้ไข Zone",
  ACTIVATE_ZONE: "เปิดใช้งาน Zone",
  DEACTIVATE_ZONE: "ปิดใช้งาน Zone",
  DELETE_ZONE: "ลบ Zone",
  UPDATE_SLA_SETTING: "แก้ไข SLA Settings",
  UPDATE_ENGINEER_ASSIGNMENT_SETTING: "แก้ไข System Settings",
  CREATE_LINE_DESTINATION: "เพิ่มกลุ่ม LINE",
  UPDATE_LINE_DESTINATION: "แก้ไขกลุ่ม LINE",
  UPDATE_LINE_DAILY_REPORT_SETTING: "แก้ไข LINE Daily Report",
  SEND_LINE_DAILY_REPORT_TEST: "ส่ง LINE Daily Report ทดสอบ",
};

export default async function AdminHistoryPage() {
  const user = await requireUser();
  if (!canViewPlantAuditLog(user)) redirect("/dashboard");
  const auditScopeWhere = buildAuditEventScopeWhere(user);

  const events = await db.auditEvent.findMany({
    where: { action: { in: trackedActions }, ...auditScopeWhere },
    take: 200,
    orderBy: { createdAt: "desc" },
    include: { actor: true },
  });

  const createCount = events.filter((event) => event.action.startsWith("CREATE")).length;
  const deleteCount = events.filter((event) => event.action.startsWith("DELETE") || event.action.startsWith("DEACTIVATE")).length;
  const updateCount = events.length - createCount - deleteCount;

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
              <History size={16} />
              Administration History
            </p>
            <h1 className="mt-4 text-3xl font-extrabold">ประวัติการจัดการระบบ</h1>
            <p className="mt-2 max-w-3xl text-[var(--muted)]">
              แสดงประวัติการจัดการ Organization, Site, Users, Master Data, SLA, System Settings และ LINE Settings โดยไม่รวมกิจกรรมงานซ่อมทั่วไป
            </p>
          </div>
          <div className="grid min-w-72 grid-cols-3 gap-2">
            <SummaryTile label="Create" value={createCount} tone="green" />
            <SummaryTile label="Update" value={updateCount} tone="blue" />
            <SummaryTile label="Delete / Off" value={deleteCount} tone="red" />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Database size={21} className="text-[var(--primary)]" />
            รายการล่าสุด
          </h2>
          <span className="text-sm text-[var(--muted)]">{events.length} records</span>
        </div>

        <div className="mt-5 grid gap-3">
          {events.length === 0 ? (
            <div className="rounded-2xl bg-[var(--soft)] px-4 py-8 text-center text-[var(--muted)]">ยังไม่มีประวัติการจัดการระบบ</div>
          ) : (
            events.map((event) => {
              const details = readEventDetails(event.afterJson ?? event.beforeJson);
              const variant = actionVariant(event.action);
              const Icon = variant === "create" ? PlusCircle : variant === "delete" ? Trash2 : PencilLine;

              return (
                <article key={event.id} className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 md:grid-cols-[auto_1fr_auto] md:items-start">
                  <div className={iconClassName(variant)}>
                    <Icon aria-hidden="true" size={23} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-lg">{actionLabels[event.action] ?? event.action}</strong>
                      <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{event.entityType}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      ผู้ดำเนินการ: {event.actor?.fullName ?? "System"} · เลขอ้างอิง: {event.entityId}
                    </p>
                    {details ? <p className="mt-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-sm">{details}</p> : null}
                  </div>
                  <time className="text-sm font-semibold text-[var(--muted)]">{formatThaiDate(event.createdAt)}</time>
                </article>
              );
            })
          )}
        </div>
      </section>
    </AppShell>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: "green" | "blue" | "red" }) {
  const className = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
  }[tone];
  return (
    <div className={`rounded-2xl px-4 py-3 ${className}`}>
      <p className="text-sm font-semibold">{label}</p>
      <strong className="block text-3xl">{value}</strong>
    </div>
  );
}

function actionVariant(action: string) {
  if (action.startsWith("CREATE") || action.startsWith("ACTIVATE")) return "create";
  if (action.startsWith("DELETE") || action.startsWith("DEACTIVATE")) return "delete";
  return "update";
}

function iconClassName(variant: string) {
  if (variant === "create") return "grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700";
  if (variant === "delete") return "grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-700";
  return "grid h-12 w-12 place-items-center rounded-full bg-blue-100 text-blue-700";
}

function readEventDetails(json?: string | null) {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    const name = data.fullName ?? data.username ?? data.name ?? data.title ?? data.displayName ?? data.problemTitle;
    const username = data.username && data.username !== name ? ` (${String(data.username)})` : "";
    const role = data.role ? ` · Role: ${formatRoleName(String(data.role))}` : "";
    const category = data.categoryName ?? data.category;
    const categoryText = category ? ` · Category: ${String(category)}` : "";
    return name ? `${String(name)}${username}${role}${categoryText}` : null;
  } catch {
    return null;
  }
}
