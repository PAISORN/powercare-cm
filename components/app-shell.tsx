import Link from "next/link";
import { redirect } from "next/navigation";
import { Home } from "lucide-react";
import { getCurrentUser } from "../lib/session";
import { RoleName, type RoleName as RoleNameValue } from "../modules/cm-work/cm-work-types";
import { AppBrand } from "./app-brand";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileAppDrawer } from "./mobile-app-drawer";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { getUnreadCount, listRecentNotifications } from "../modules/notifications/notification-service";
import { buildUserOperationalScope } from "../modules/organization/user-plant-scope";
import { formatRoleName } from "../modules/users/role-labels";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = buildUserOperationalScope(user);
  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadCount(user.id, scope),
    listRecentNotifications(user.id, 10, scope),
  ]);
  const displayName = user.role === RoleName.ADMIN ? formatRoleName(user.role) : user.fullName;

  return (
    <div className="min-h-screen">
      <DesktopSidebar
        categoryName={user.category?.name}
        fullName={displayName}
        hasPhoto={Boolean(user.profilePhoto)}
        plantId={user.plantId}
        role={user.role as RoleNameValue}
        siteAdminPermissions={user.siteAdminPermissions}
        userId={user.id}
        version={user.profilePhoto?.updatedAt.getTime()}
      />

      <main className="min-h-screen p-5 transition-[margin] duration-300 md:ml-[var(--app-sidebar-width,18rem)] md:p-8">
        <div
          className="sticky top-3 z-40 mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 px-2.5 py-2.5 shadow-[var(--shadow)] backdrop-blur transition-all duration-200 sm:gap-3 sm:px-3 md:top-4 md:rounded-3xl md:px-4 md:py-3"
          data-app-top-bar
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <MobileAppDrawer
                userName={displayName}
                role={user.role as RoleNameValue}
                categoryName={user.category?.name}
                userId={user.id}
                plantId={user.plantId}
                siteAdminPermissions={user.siteAdminPermissions}
                hasPhoto={Boolean(user.profilePhoto)}
                version={user.profilePhoto?.updatedAt.getTime()}
                unreadCount={unreadCount}
              />
              <Link className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary)] text-white shadow-sm transition hover:bg-[var(--primary-strong)] sm:h-10 sm:w-10" href="/dashboard" aria-label="Home" title="Home">
                <Home size={18} />
              </Link>
            </div>
          </div>
          <div className="min-w-0 md:pl-1">
            <p className="truncate text-sm font-bold sm:text-base md:hidden"><AppBrand className="flex-nowrap" versionClassName="hidden sm:inline" /></p>
            <p className="hidden truncate text-xs text-[var(--muted)] min-[390px]:block sm:text-sm">{displayName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
            <NotificationBell unreadCount={unreadCount} notifications={recentNotifications} />
            <ThemeToggle />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
