import { Activity, Circle, Clock3, MonitorCheck, MonitorX, type LucideIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { db } from "../../../lib/db";
import { formatThaiDateTime } from "../../../lib/date-time/bangkok-time";
import { requireUser } from "../../../lib/session";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import { formatRoleName } from "../../../modules/users/role-labels";

const onlineWindowMs = 5 * 60 * 1000;

export default async function OwnerStatusPage() {
  const currentUser = await requireUser();
  if (currentUser.role !== RoleName.ADMIN) redirect("/dashboard");

  const onlineSince = new Date(Date.now() - onlineWindowMs);
  const users = await db.user.findMany({
    where: { active: true },
    orderBy: [{ lastSeenAt: "desc" }, { fullName: "asc" }],
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      department: true,
      lastSeenAt: true,
      organization: { select: { name: true } },
      plant: { select: { name: true } },
      profilePhoto: { select: { updatedAt: true } },
    },
  });

  const decorated = users.map((user) => ({
    ...user,
    online: Boolean(user.lastSeenAt && user.lastSeenAt >= onlineSince),
  }));
  const onlineUsers = decorated.filter((user) => user.online);
  const offlineUsers = decorated.filter((user) => !user.online);

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-semibold text-[var(--primary)]">
              <Activity size={16} />
              Owner Admin Status
            </p>
            <h1 className="mt-4 text-3xl font-extrabold">สถานะผู้ใช้งานระบบ</h1>
            <p className="mt-2 max-w-3xl text-[var(--muted)]">
              แสดงผู้ใช้ที่มีการใช้งานล่าสุดภายใน 5 นาทีเป็น Online และผู้ใช้ที่ไม่พบการใช้งานล่าสุดเป็น Offline
            </p>
          </div>
          <div className="grid min-w-64 grid-cols-2 gap-2">
            <StatusCountCard icon={MonitorCheck} label="Online" value={onlineUsers.length} tone="green" />
            <StatusCountCard icon={MonitorX} label="Offline" value={offlineUsers.length} tone="slate" />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-2">
        <UserStatusPanel title="Online" users={onlineUsers} tone="green" />
        <UserStatusPanel title="Offline" users={offlineUsers} tone="slate" />
      </section>
    </AppShell>
  );
}

function StatusCountCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "green" | "slate";
}) {
  const className = tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700";
  return (
    <div className={`rounded-2xl px-4 py-3 ${className}`}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon size={16} /> {label}
      </p>
      <strong className="mt-1 block text-3xl">{value}</strong>
    </div>
  );
}

function UserStatusPanel({
  title,
  users,
  tone,
}: {
  title: string;
  users: Array<{
    id: string;
    username: string;
    fullName: string;
    role: string;
    department: string | null;
    lastSeenAt: Date | null;
    online: boolean;
    organization: { name: string } | null;
    plant: { name: string } | null;
    profilePhoto: { updatedAt: Date } | null;
  }>;
  tone: "green" | "slate";
}) {
  const dot = tone === "green" ? "bg-emerald-500" : "bg-slate-400";
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <span className={`h-3 w-3 rounded-full ${dot}`} />
          {title}
        </h2>
        <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-bold text-[var(--muted)]">{users.length} users</span>
      </div>
      <div className="mt-4 grid gap-3">
        {users.length ? (
          users.map((user) => (
            <article key={user.id} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface)]">
                {user.profilePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={user.fullName} className="h-full w-full object-cover" src={`/profile-photo/${user.id}?v=${user.profilePhoto.updatedAt.getTime()}`} />
                ) : (
                  <span className="grid h-full w-full place-items-center text-sm font-black text-[var(--primary)]">
                    {user.fullName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="truncate">{user.fullName}</strong>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-1 text-xs font-bold text-[var(--muted)]">
                    <Circle className={user.online ? "fill-emerald-500 text-emerald-500" : "fill-slate-400 text-slate-400"} size={8} />
                    {user.online ? "Online" : "Offline"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  @{user.username} · {formatRoleName(user.role)} · {user.department ?? "-"}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {user.organization?.name ?? "No organization"} / {user.plant?.name ?? "No site"}
                </p>
              </div>
              <p className="flex items-center gap-1 text-sm font-semibold text-[var(--muted)]">
                <Clock3 size={14} />
                {user.lastSeenAt ? formatThaiDateTime(user.lastSeenAt) : "ยังไม่เคยออนไลน์"}
              </p>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-[var(--muted)]">ไม่มีผู้ใช้ในสถานะนี้</p>
        )}
      </div>
    </div>
  );
}
