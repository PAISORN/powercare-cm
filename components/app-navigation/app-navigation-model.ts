import {
  Archive,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  Factory,
  History,
  Bell,
  LogOut,
  Megaphone,
  MessageSquareText,
  MessageCircleMore,
  Package,
  PlusCircle,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  UserRound,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  RoleName,
  type RoleName as RoleValue,
} from "../../modules/cm-work/cm-work-types";
import {
  canUsePermission,
  PermissionKey,
  type RolePermissionOverrideRecord,
  type SiteAdminPermissionRecord,
  type UserPermissionOverrideRecord,
} from "../../modules/auth/site-admin-permissions";

export type AppLink = {
  label: string;
  href?: string;
  icon?: LucideIcon;
  accent?: "danger";
  kind?: "link" | "section";
  nested?: boolean;
  disabled?: boolean;
  depth?: 1 | 2;
  sectionId?: string;
  parentSectionId?: string;
};

export type AppPermissionContext = {
  id?: string;
  organizationId?: string | null;
  plantId?: string | null;
  plantCode?: string | null;
  siteAdminPermissions?: SiteAdminPermissionRecord[];
  rolePermissionOverrides?: RolePermissionOverrideRecord[];
  userPermissionOverrides?: UserPermissionOverrideRecord[];
};

export function getAppLinks(
  role: RoleValue,
  permissionContext: AppPermissionContext = {},
): AppLink[] {
  const canUse = (permissionKey: PermissionKey) =>
    canUsePermission(
      {
        id: permissionContext.id,
        role,
        organizationId: permissionContext.organizationId,
        plantId: permissionContext.plantId,
      },
      permissionKey,
      permissionContext.siteAdminPermissions ?? [],
      permissionContext.rolePermissionOverrides ?? [],
      permissionContext.userPermissionOverrides ?? [],
    );
  const canUseAny = (...permissionKeys: PermissionKey[]) =>
    permissionKeys.some((permissionKey) => canUse(permissionKey));
  const inventoryLink = (link: AppLink, allowed: boolean): AppLink =>
    allowed ? link : { ...link, href: "#", disabled: true };
  const baseLinks: AppLink[] = [];

  const dashboardLinks: AppLink[] = [];
  if (canUse(PermissionKey.VIEW_DASHBOARD)) {
    dashboardLinks.push({
      label: "Dashboard CM",
      href: "/dashboardcm",
      icon: BarChart3,
      nested: true,
      parentSectionId: "dashboard",
    });
  }
  if (canUse(PermissionKey.VIEW_PM)) {
    dashboardLinks.push({
      label: "Dashboard PM",
      href: "/dashboardpm",
      icon: CalendarDays,
      nested: true,
      parentSectionId: "dashboard",
    });
  }
  if (canUse(PermissionKey.VIEW_STORE_DASHBOARD)) {
    dashboardLinks.push({
      label: "Dashboard Store",
      href: "/dashboardstore",
      icon: Archive,
      nested: true,
      parentSectionId: "dashboard",
    });
  }
  if (dashboardLinks.length > 0) {
    baseLinks.push(
      {
        label: "Dashboard",
        kind: "section",
        icon: BarChart3,
        sectionId: "dashboard",
      },
      ...dashboardLinks,
    );
  }

  if (canUse(PermissionKey.VIEW_MY_ACTIVITIES)) {
    baseLinks.push({
      label: "My Activities",
      href: "/activities",
      icon: ClipboardList,
    });
  }

  const maintenanceLinks: AppLink[] = [];

  if (canUse(PermissionKey.VIEW_ALL_WORK)) {
    maintenanceLinks.push({
      label: "All Work",
      href: "/work",
      icon: Wrench,
      nested: true,
      parentSectionId: "maintenance",
    });
  }

  if (
    role !== RoleName.ADMIN &&
    permissionContext.plantCode &&
    canUse(PermissionKey.CREATE_INTERNAL_REQUEST)
  ) {
    maintenanceLinks.push({
      label: "Create Request",
      href: `/p/${encodeURIComponent(permissionContext.plantCode.toLowerCase())}/request`,
      icon: PlusCircle,
      nested: true,
      parentSectionId: "maintenance",
    });
  }

  if (
    role !== RoleName.ADMIN &&
    permissionContext.plantCode &&
    canUse(PermissionKey.TRACK_WORK)
  ) {
    maintenanceLinks.push({
      label: "Track Work",
      href: `/p/${encodeURIComponent(permissionContext.plantCode.toLowerCase())}/tracking`,
      icon: Search,
      nested: true,
      parentSectionId: "maintenance",
    });
  }

  if (canUse(PermissionKey.VIEW_NOTIFICATIONS)) {
    maintenanceLinks.push({
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      nested: true,
      parentSectionId: "maintenance",
    });
  }

  if (canUse(PermissionKey.VIEW_REPORTS)) {
    maintenanceLinks.push({
      label: "Report",
      href: "/reports",
      icon: FileSpreadsheet,
      nested: true,
      parentSectionId: "maintenance",
    });
  }

  if (maintenanceLinks.length > 0) {
    baseLinks.push(
      { label: "CM", kind: "section", icon: Wrench, sectionId: "maintenance" },
      ...maintenanceLinks,
    );
  }

  if (canUse(PermissionKey.VIEW_ASSETS)) {
    baseLinks.push(
      { label: "Assets", kind: "section", icon: Boxes, sectionId: "assets" },
      {
        label: "Assets",
        href: "/assets",
        icon: Boxes,
        nested: true,
        parentSectionId: "assets",
      },
    );
    if (canUse(PermissionKey.MANAGE_ASSET_MASTERS)) {
      baseLinks.push({
        label: "Asset Master Data",
        href: "/assets/master-data",
        icon: Factory,
        nested: true,
        parentSectionId: "assets",
      });
    }
    if (canUse(PermissionKey.MANAGE_ASSET_QR_PROFILE)) {
      baseLinks.push({
        label: "QR Public Profile",
        href: "/assets/qr-settings",
        icon: QrCode,
        nested: true,
        parentSectionId: "assets",
      });
    }
    baseLinks.push(
      {
        label: "Equipment",
        href: "#",
        icon: Factory,
        nested: true,
        disabled: true,
        parentSectionId: "assets",
      },
      {
        label: "Meter Reading",
        href: "#",
        icon: CalendarDays,
        nested: true,
        disabled: true,
        parentSectionId: "assets",
      },
      {
        label: "Asset Analytics",
        href: "#",
        icon: BarChart3,
        nested: true,
        disabled: true,
        parentSectionId: "assets",
      },
    );
  }

  const pmLinks: AppLink[] = [];
  if (canUse(PermissionKey.VIEW_PM)) {
    pmLinks.push(
      {
        label: "PM Setup",
        href: "/dashboardpm/setup",
        icon: Settings,
        nested: true,
        parentSectionId: "pm",
      },
      {
        label: "PM Calendar",
        href: "/dashboardpm/calendar",
        icon: CalendarDays,
        nested: true,
        parentSectionId: "pm",
      },
      {
        label: "PM Work",
        href: "/dashboardpm/work",
        icon: ClipboardList,
        nested: true,
        parentSectionId: "pm",
      },
    );
  }
  if (canUse(PermissionKey.MANAGE_PM_GROUPS)) {
    const workIndex = pmLinks.findIndex(
      (link) => link.href === "/dashboardpm/work",
    );
    pmLinks.splice(workIndex < 0 ? pmLinks.length : workIndex, 0, {
      label: "PM Groups",
      href: "/dashboardpm/groups",
      icon: Boxes,
      nested: true,
      parentSectionId: "pm",
    });
  }
  if (pmLinks.length > 0) {
    baseLinks.push(
      { label: "PM", kind: "section", icon: ClipboardList, sectionId: "pm" },
      ...pmLinks,
    );
  }

  const organizationLinks: AppLink[] = [];
  if (canUse(PermissionKey.VIEW_MEMBERS)) {
    organizationLinks.push({
      label: "Members",
      href: "/members",
      icon: UsersRound,
      nested: true,
      parentSectionId: "organization",
    });
  }
  if (
    canUse(PermissionKey.MANAGE_COMPANY_ORGANIZATION) ||
    canUse(PermissionKey.MANAGE_PLANT_PROFILE)
  ) {
    organizationLinks.unshift({
      label: "Organizations",
      href: "/admin/organization",
      icon: Building2,
      nested: true,
      parentSectionId: "organization",
    });
  }
  if (role === RoleName.ADMIN || role === RoleName.ORGANIZATION_ADMIN) {
    organizationLinks.push({
      label: "Sites",
      href: "/admin/sites",
      icon: Factory,
      nested: true,
      parentSectionId: "organization",
    });
  }
  if (role === RoleName.ADMIN) {
    organizationLinks.push({
      label: "Permissions",
      href: "/admin/permissions",
      icon: ShieldCheck,
      nested: true,
      parentSectionId: "organization",
    });
  }

  if (organizationLinks.length > 0) {
    baseLinks.push(
      {
        label: "Organization",
        kind: "section",
        icon: Building2,
        sectionId: "organization",
      },
      ...organizationLinks,
    );
  }

  baseLinks.push(
    {
      label: "Inventory",
      kind: "section",
      icon: Archive,
      sectionId: "inventory",
    },
    inventoryLink(
      {
        label: "Spare Parts",
        href: "/dashboardstore/spare-parts",
        icon: Package,
        nested: true,
        parentSectionId: "inventory",
      },
      canUseAny(
        PermissionKey.MANAGE_SPARE_PARTS,
        PermissionKey.VIEW_STORE_STOCK,
      ),
    ),
    inventoryLink(
      {
        label: "Stock",
        href: "/dashboardstore/stock",
        icon: Boxes,
        nested: true,
        parentSectionId: "inventory",
      },
      canUseAny(PermissionKey.VIEW_STORE_STOCK, PermissionKey.ADJUST_STOCK),
    ),
    inventoryLink(
      {
        label: "Stock Issue",
        href: "/dashboardstore/issue?view=tracking",
        icon: ClipboardList,
        nested: true,
        parentSectionId: "inventory",
      },
      canUseAny(
        PermissionKey.VIEW_STORE_TRACKING,
        PermissionKey.APPROVE_STORE_ISSUE,
        PermissionKey.ISSUE_STOCK,
      ),
    ),
    inventoryLink(
      {
        label: "Issue",
        href: "/dashboardstore/issue?view=create",
        icon: ArrowUpFromLine,
        nested: true,
        parentSectionId: "inventory",
      },
      canUse(PermissionKey.CREATE_STORE_ISSUE),
    ),
    inventoryLink(
      {
        label: "Issue Public",
        href: "/dashboardstore/public-issue",
        icon: QrCode,
        nested: true,
        parentSectionId: "inventory",
      },
      canUseAny(
        PermissionKey.MANAGE_SPARE_PARTS,
        PermissionKey.VIEW_STORE_STOCK,
        PermissionKey.CREATE_STORE_ISSUE,
        PermissionKey.APPROVE_STORE_ISSUE,
        PermissionKey.ISSUE_STOCK,
        PermissionKey.ENABLE_PUBLIC_STORE_ISSUE,
      ),
    ),
    inventoryLink(
      {
        label: "Receive",
        href: "/dashboardstore/receive",
        icon: ArrowDownToLine,
        nested: true,
        parentSectionId: "inventory",
      },
      canUse(PermissionKey.RECEIVE_STOCK),
    ),
    inventoryLink(
      {
        label: "Issue Tracking",
        href: "/dashboardstore/tracking",
        icon: Search,
        nested: true,
        parentSectionId: "inventory",
      },
      canUse(PermissionKey.VIEW_STORE_TRACKING),
    ),
    inventoryLink(
      {
        label: "Stock Movement",
        href: "/dashboardstore/movements",
        icon: History,
        nested: true,
        parentSectionId: "inventory",
      },
      canUseAny(
        PermissionKey.VIEW_STORE_STOCK,
        PermissionKey.VIEW_STORE_REPORTS,
        PermissionKey.ADJUST_STOCK,
      ),
    ),
    inventoryLink(
      {
        label: "Store Reports",
        href: "/dashboardstore/reports",
        icon: FileSpreadsheet,
        nested: true,
        parentSectionId: "inventory",
      },
      canUse(PermissionKey.VIEW_STORE_REPORTS),
    ),
  );

  const masterDataLinks: AppLink[] = [];
  if (canUse(PermissionKey.MANAGE_CATEGORY)) {
    masterDataLinks.push({
      label: "Categories",
      href: "/admin/categories",
      icon: Tags,
      nested: true,
      parentSectionId: "master-data",
    });
  }
  if (canUse(PermissionKey.MANAGE_ZONE)) {
    masterDataLinks.push({
      label: "Zones",
      href: "/admin/zones",
      icon: Factory,
      nested: true,
      parentSectionId: "master-data",
    });
  }
  if (canUse(PermissionKey.MANAGE_QR_CODE)) {
    masterDataLinks.push({
      label: "QR Codes",
      href: "/admin/qr-code",
      icon: Search,
      nested: true,
      parentSectionId: "master-data",
    });
  }
  if (canUse(PermissionKey.MANAGE_SLA_DUE_DATE)) {
    masterDataLinks.push({
      label: "SLA Settings",
      href: "/admin/sla",
      icon: CalendarDays,
      nested: true,
      parentSectionId: "master-data",
    });
  }
  if (masterDataLinks.length > 0) {
    baseLinks.push(
      {
        label: "Master Data",
        kind: "section",
        icon: Tags,
        sectionId: "master-data",
      },
      ...masterDataLinks,
    );
  }

  const communicationLinks: AppLink[] = [];
  if (canUse(PermissionKey.MANAGE_ANNOUNCEMENTS)) {
    communicationLinks.push({
      label: "Announcements",
      href: "/admin/announcements",
      icon: Megaphone,
      nested: true,
      parentSectionId: "communication",
    });
  }
  if (canUse(PermissionKey.VIEW_FEEDBACK_ALL_PLANTS)) {
    communicationLinks.push({
      label: "Feedback",
      href: "/admin/feedback",
      icon: MessageSquareText,
      nested: true,
      parentSectionId: "communication",
    });
  }
  if (communicationLinks.length > 0) {
    baseLinks.push(
      {
        label: "Communication",
        kind: "section",
        icon: MessageCircleMore,
        sectionId: "communication",
      },
      ...communicationLinks,
    );
  }

  const administrationLinks: AppLink[] = [];
  if (role === RoleName.ADMIN) {
    administrationLinks.push({
      label: "Status",
      href: "/admin/status",
      icon: Activity,
      nested: true,
      parentSectionId: "administration",
    });
  }
  if (
    canUse(PermissionKey.MANAGE_USERS_ALL_PLANTS) ||
    canUse(PermissionKey.MANAGE_USERS_PLANT)
  ) {
    administrationLinks.push({
      label: "Admin Users",
      href: "/admin/users",
      icon: Settings,
      nested: true,
      parentSectionId: "administration",
    });
  }
  if (
    canUse(PermissionKey.MANAGE_SYSTEM_SETTINGS) ||
    canUse(PermissionKey.MANAGE_ENGINEER_ASSIGNMENT)
  ) {
    administrationLinks.push({
      label: "System Settings",
      href: "/admin/settings",
      icon: SlidersHorizontal,
      nested: true,
      parentSectionId: "administration",
    });
  }
  if (canUse(PermissionKey.MANAGE_LINE_SETTINGS)) {
    administrationLinks.push({
      label: "LINE Settings",
      href: "/admin/line",
      icon: MessageCircleMore,
      nested: true,
      parentSectionId: "administration",
    });
  }
  if (
    canUse(PermissionKey.VIEW_AUDIT_LOG_ALL_PLANTS) ||
    canUse(PermissionKey.VIEW_AUDIT_LOG_PLANT)
  ) {
    administrationLinks.push({
      label: "History",
      href: "/admin/history",
      icon: History,
      nested: true,
      parentSectionId: "administration",
    });
  }
  if (administrationLinks.length > 0) {
    baseLinks.push(
      {
        label: "Administration",
        kind: "section",
        icon: Settings,
        sectionId: "administration",
      },
      ...administrationLinks,
    );
  }

  const orderedLinks = orderPrimaryNavigation(baseLinks);
  orderedLinks.push({ label: "Settings", href: "/settings", icon: Settings });
  orderedLinks.push({ label: "Profile", href: "/profile", icon: UserRound });
  orderedLinks.push({
    label: "Logout",
    href: "/logout",
    icon: LogOut,
    accent: "danger",
  });

  return orderedLinks;
}
function orderPrimaryNavigation(links: AppLink[]) {
  const priority = new Map([
    ["Dashboard", 0],
    ["My Activities", 1],
    ["CM", 2],
    ["PM", 3],
    ["Inventory", 4],
    ["Assets", 5],
    ["Organization", 6],
  ]);
  const groups: AppLink[][] = [];
  for (const link of links) {
    if (!link.nested || groups.length === 0) groups.push([link]);
    else groups.at(-1)!.push(link);
  }
  return groups
    .map((group, index) => ({
      group,
      index,
      priority: priority.get(group[0].label) ?? 7,
    }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .flatMap(({ group }) => group);
}

export function isActivePath(
  pathname: string,
  href: string,
  searchParams?: Pick<URLSearchParams, "get"> | null,
) {
  const [hrefWithoutHash] = href.split("#");
  const [cleanHref, hrefQuery = ""] = hrefWithoutHash.split("?");
  if (!cleanHref || cleanHref === "#") return false;
  const exactPmRoute =
    cleanHref === "/dashboardpm" || cleanHref === "/dashboardpm/calendar";
  if (
    pathname !== cleanHref &&
    (exactPmRoute || !pathname.startsWith(`${cleanHref}/`))
  )
    return false;
  if (!hrefQuery) return true;

  const expectedParams = new URLSearchParams(hrefQuery);
  return Array.from(expectedParams.entries()).every(
    ([key, value]) => searchParams?.get(key) === value,
  );
}
