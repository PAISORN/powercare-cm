import { Bell, CheckCheck } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { requireUser } from "../../lib/session";
import { getUnreadCount, listNotifications } from "../../modules/notifications/notification-service";

export default async function NotificationsPage() {
  const user = await requireUser();
  const [notifications, unreadCount] = await Promise.all([
    listNotifications(user.id, 1, 50),
    getUnreadCount(user.id),
  ]);

  return (
    <AppShell>
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-extrabold sm:text-3xl">
              <Bell className="text-[var(--primary)]" /> Notifications
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{unreadCount} unread notifications</p>
          </div>
          <form action="/notifications/read-all" method="post">
            <button className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white shadow-sm" type="submit">
              <CheckCheck size={17} /> Mark all as read
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-3">
          {notifications.length ? notifications.map((notification) => (
            <form action="/notifications/read" key={notification.id} method="post">
              <input name="notificationId" type="hidden" value={notification.id} />
              <button className={`relative w-full rounded-2xl border border-[var(--line)] p-4 text-left transition hover:bg-[var(--soft)] ${notification.readAt ? "bg-[var(--surface)]" : "bg-[var(--soft)] ring-1 ring-[var(--primary)]/20"}`} type="submit">
                {!notification.readAt ? <span aria-label="Unread" className="absolute right-4 top-4 h-3 w-3 rounded-full bg-red-600" /> : null}
                <strong className="block pr-8">{notification.title}</strong>
                <span className="mt-1 block text-sm text-[var(--muted)]">{notification.message}</span>
                <span className="mt-3 block text-xs text-[var(--muted)]">{formatThaiDateTime(notification.createdAt)}</span>
              </button>
            </form>
          )) : <p className="rounded-2xl bg-[var(--soft)] p-8 text-center text-[var(--muted)]">No notifications yet.</p>}
        </div>
      </section>
    </AppShell>
  );
}
