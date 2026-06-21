import { Database, History, PlusCircle, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { formatThaiDateTime as formatThaiDate } from "../../../lib/date-time/bangkok-time";
import { requireUser } from "../../../lib/session";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

const trackedActions = [
  "CREATE_USER",
  "DELETE_USER",
  "CREATE_REPAIR_REQUEST",
  "CREATE_CATEGORY",
  "DEACTIVATE_CATEGORY",
  "CREATE_ZONE",
  "DEACTIVATE_ZONE",
];

const actionLabels: Record<string, string> = {
  CREATE_USER: "เพิ่ม User",
  DELETE_USER: "ลบ User",
  CREATE_REPAIR_REQUEST: "เพิ่มใบแจ้งซ่อม",
  CREATE_CATEGORY: "เพิ่ม Category",
  DEACTIVATE_CATEGORY: "ปิดใช้งาน Category",
  CREATE_ZONE: "เพิ่ม Zone",
  DEACTIVATE_ZONE: "ปิดใช้งาน Zone",
};

export default async function AdminHistoryPage() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");

  const events = await db.auditEvent.findMany({
    where: { action: { in: trackedActions } },
    take: 200,
    orderBy: { createdAt: "desc" },
    include: { actor: true, cmWork: true },
  });

  const addCount = events.filter((event) => event.action.startsWith("CREATE")).length;
  const removeCount = events.length - addCount;

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
              <History size={16} />
              Admin Record History
            </p>
            <h1 className="mt-4 text-3xl font-extrabold">Add / Delete History</h1>
            <p className="mt-2 max-w-3xl text-[var(--muted)]">ประวัติการเพิ่ม ลบ หรือปิดใช้งานข้อมูลสำคัญในระบบ สำหรับตรวจสอบย้อนหลังว่าใครทำอะไรและทำเมื่อไร</p>
          </div>
          <div className="grid min-w-56 grid-cols-2 gap-2">
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
              <p className="text-sm font-semibold">Add</p>
              <strong className="block text-3xl">{addCount}</strong>
            </div>
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-red-700">
              <p className="text-sm font-semibold">Delete</p>
              <strong className="block text-3xl">{removeCount}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Database size={21} className="text-[var(--primary)]" />
            History List
          </h2>
          <span className="text-sm text-[var(--muted)]">{events.length} records</span>
        </div>

        <div className="mt-5 grid gap-3">
          {events.length === 0 ? (
            <div className="rounded-2xl bg-[var(--soft)] px-4 py-8 text-center text-[var(--muted)]">ยังไม่มีประวัติ Add/Delete</div>
          ) : (
            events.map((event) => {
              const details = readEventDetails(event.afterJson ?? event.beforeJson);
              const isCreate = event.action.startsWith("CREATE");
              const Icon = isCreate ? PlusCircle : Trash2;

              return (
                <article key={event.id} className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 md:grid-cols-[auto_1fr_auto] md:items-start">
                  <div className={isCreate ? "grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700" : "grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-700"}>
                    <Icon aria-hidden="true" size={23} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-lg">{actionLabels[event.action] ?? event.action}</strong>
                      <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">{event.entityType}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      ผู้ดำเนินการ: {event.actor?.fullName ?? "System"} · เลขอ้างอิง: {event.cmWork?.number ?? event.entityId}
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

function readEventDetails(json?: string | null) {
  if (!json) return null;
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    const name = data.fullName ?? data.username ?? data.name ?? data.title ?? data.problemTitle;
    const username = data.username && data.username !== name ? ` (${String(data.username)})` : "";
    const role = data.role ? ` · Role: ${String(data.role)}` : "";
    const category = data.categoryName ?? data.category;
    const categoryText = category ? ` · Category: ${String(category)}` : "";
    return name ? `${String(name)}${username}${role}${categoryText}` : null;
  } catch {
    return null;
  }
}
