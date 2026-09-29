import { redirect } from "next/navigation";
import { getCurrentUser } from "../lib/session";
import {
  RoleName,
  type RoleName as RoleNameValue,
} from "../modules/cm-work/cm-work-types";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileAppDrawer } from "./mobile-app-drawer";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import {
  getUnreadCount,
  listRecentNotifications,
} from "../modules/notifications/notification-service";
import { buildUserOperationalScope } from "../modules/organization/user-plant-scope";
import { formatRoleName } from "../modules/users/role-labels";
import { ScrollLockRecovery } from "./scroll-lock-recovery";

export async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const scope = buildUserOperationalScope(user);
  const [unreadCount, recentNotifications] = await Promise.all([
    getUnreadCount(user.id, scope),
    listRecentNotifications(user.id, 10, scope),
  ]);
  const displayName =
    user.role === RoleName.ADMIN ? formatRoleName(user.role) : user.fullName;

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
          className="mb-5 flex items-center justify-between md:hidden"
          data-mobile-app-controls
        >
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
          <div className="flex items-center gap-2">
            <NotificationBell
              unreadCount={unreadCount}
              notifications={recentNotifications}
            />
            <ThemeToggle compact />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
