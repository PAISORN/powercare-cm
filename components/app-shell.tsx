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
import { defaultHomeHref } from "../modules/auth/default-home-route";
import { DashboardTypeNav } from "./dashboard-type-nav";
import { ScrollLockRecovery } from "./scroll-lock-recovery";

export async function AppShell({ children }: { children: React.ReactNode; immersiveMobile?: boolean }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = buildUserOperationalScope(user);
  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadCount(user.id, scope),
    listRecentNotifications(user.id, 10, scope),
  ]);
  const displayName = user.role === RoleName.ADMIN ? formatRoleName(user.role) : user.fullName;
  const homeHref = defaultHomeHref(user);

  return (
    <div className="min-h-screen">
      <ScrollLockRecovery />
      <DesktopSidebar
        categoryName={user.category?.name}
        fullName={displayName}
        hasPhoto={Boolean(user.profilePhoto)}
        plantCode={user.plant?.code}
        plantId={user.plantId}
        organizationId={user.organizationId}
        role={user.role as RoleNameValue}
        rolePermissionOverrides={user.rolePermissionOverrides}
        siteAdminPermissions={user.siteAdminPermissions}
        userPermissionOverrides={user.userPermissionOverrides}
        userId={user.id}
        version={user.profilePhoto?.updatedAt.getTime()}
      />

      <main className="app-workspace min-h-screen p-5 transition-[margin] duration-300 md:ml-[var(--app-sidebar-width,18rem)] md:p-8">
        <div
          className="ops-topbar fixed z-40 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)]/94 px-2.5 py-2.5 shadow-[var(--shadow)] backdrop-blur sm:gap-3 sm:px-3 md:rounded-3xl md:px-4 md:py-3"
          data-app-top-bar
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <MobileAppDrawer
                userName={displayName}
                role={user.role as RoleNameValue}
                categoryName={user.category?.name}
                userId={user.id}
                organizationId={user.organizationId}
                plantId={user.plantId}
                plantCode={user.plant?.code}
                siteAdminPermissions={user.siteAdminPermissions}
                rolePermissionOverrides={user.rolePermissionOverrides}
                userPermissionOverrides={user.userPermissionOverrides}
                hasPhoto={Boolean(user.profilePhoto)}
                version={user.profilePhoto?.updatedAt.getTime()}
                unreadCount={unreadCount}
              />
              <Link className="grid size-10 place-items-center rounded-full bg-[var(--primary)] text-white shadow-sm transition hover:bg-[var(--primary-strong)]" href={homeHref} aria-label="Dashboard" title="Dashboard">
                <Home size={18} />
              </Link>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-4 md:pl-1">
            <div className="hidden min-w-0 min-[440px]:block md:min-w-24">
              <p className="truncate text-sm font-bold sm:text-base md:hidden"><AppBrand className="flex-nowrap" versionClassName="hidden sm:inline" /></p>
              <p className="hidden truncate text-xs text-[var(--muted)] min-[390px]:block sm:text-sm">{displayName}</p>
            </div>
            <div className="hidden self-stretch md:block"><DashboardTypeNav /></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <NotificationBell unreadCount={unreadCount} notifications={recentNotifications} />
            <ThemeToggle compact />
            <div className="md:hidden"><DashboardTypeNav mobile /></div>
          </div>
        </div>
        <div aria-hidden="true" className="h-[4.75rem] md:h-[5.25rem]" data-app-top-bar-spacer />
        {children}
      </main>
    </div>
  );
}
