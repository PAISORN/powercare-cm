import Link from "next/link";
import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import { getCurrentUser } from "../lib/session";
import type { RoleName } from "../modules/cm-work/cm-work-types";
import { AppNavLinks } from "./app-nav-links";
import { AppBrand } from "./app-brand";
import { MobileAppDrawer } from "./mobile-app-drawer";
import { ThemeToggle } from "./theme-toggle";
import { UserAvatar } from "./user-avatar";
import { NotificationBell } from "./notification-bell";
import { getUnreadCount, listRecentNotifications } from "../modules/notifications/notification-service";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadCount(user.id),
    listRecentNotifications(user.id),
  ]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden h-screen w-72 flex-col border-r border-[var(--line)] bg-[var(--surface)] p-5 md:flex">
        <Link className="text-2xl font-extrabold text-[var(--primary)]" href="/dashboard">
          <AppBrand />
        </Link>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[var(--soft)] p-3">
          <span data-testid="sidebar-user-avatar">
            <UserAvatar fullName={user.fullName} hasPhoto={Boolean(user.profilePhoto)} size="md" userId={user.id} version={user.profilePhoto?.updatedAt.getTime()} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold">{user.fullName}</p>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {user.role}
              {user.category ? ` - ${user.category.name}` : ""}
            </p>
          </div>
        </div>

        <nav
          className="mt-6 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain pr-1"
          data-testid="desktop-sidebar-nav"
        >
          <AppNavLinks role={user.role as RoleName} />
        </nav>
      </aside>

      <main className="min-h-screen p-5 md:ml-72 md:p-8">
        <div className="mb-6 flex items-center justify-between gap-2 rounded-3xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 shadow-[var(--shadow)] md:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <MobileAppDrawer
                userName={user.fullName}
                role={user.role as RoleName}
                categoryName={user.category?.name}
                userId={user.id}
                hasPhoto={Boolean(user.profilePhoto)}
                version={user.profilePhoto?.updatedAt.getTime()}
                unreadCount={unreadCount}
              />
              <Link className="grid h-10 w-10 place-items-center rounded-full bg-[var(--primary)] text-white shadow-sm transition hover:bg-[var(--primary-strong)]" href="/dashboard" aria-label="Home" title="Home">
                <Home size={18} />
              </Link>
            </div>
            <div className="min-w-0">
              <p className="font-bold md:hidden"><AppBrand /></p>
              <p className="truncate text-sm text-[var(--muted)]">{user.fullName}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <NotificationBell unreadCount={unreadCount} notifications={recentNotifications} />
            <ThemeToggle />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
