"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Archive,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  ChevronRight,
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
import { RoleName, type RoleName as RoleValue } from "../modules/cm-work/cm-work-types";
import {
  canUsePermission,
  PermissionKey,
  type SiteAdminPermissionRecord,
} from "../modules/auth/site-admin-permissions";

type AppLink = {
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
  plantId?: string | null;
  siteAdminPermissions?: SiteAdminPermissionRecord[];
};

export function getAppLinks(role: RoleValue, permissionContext: AppPermissionContext = {}): AppLink[] {
  const canUse = (permissionKey: PermissionKey) =>
    canUsePermission(
      { id: permissionContext.id, role, plantId: permissionContext.plantId },
      permissionKey,
      permissionContext.siteAdminPermissions ?? [],
  );
  const canUseAny = (...permissionKeys: PermissionKey[]) => permissionKeys.some((permissionKey) => canUse(permissionKey));
  const inventoryLink = (link: AppLink, allowed: boolean): AppLink => (allowed ? link : { ...link, href: "#", disabled: true });
  const baseLinks: AppLink[] = [];

  if (canUse(PermissionKey.VIEW_DASHBOARD)) {
    baseLinks.push({ label: "Dashboard", href: "/dashboard", icon: BarChart3 });
  }

  if (
    role !== RoleName.VISITOR &&
    canUseAny(
      PermissionKey.VIEW_ALL_WORK,
      PermissionKey.APPROVE_STORE_ISSUE,
      PermissionKey.ISSUE_STOCK,
      PermissionKey.CREATE_STORE_ISSUE,
    )
  ) {
    baseLinks.push({ label: "My Activities", href: "/activities", icon: ClipboardList });
  }

  const maintenanceLinks: AppLink[] = [];

  if (canUse(PermissionKey.VIEW_ALL_WORK)) {
    maintenanceLinks.push({ label: "All Work", href: "/work", icon: Wrench, nested: true, parentSectionId: "maintenance" });
  }

  if (canUse(PermissionKey.CREATE_INTERNAL_REQUEST)) {
    maintenanceLinks.push({ label: "Create Request", href: "/request", icon: PlusCircle, nested: true, parentSectionId: "maintenance" });
  }

  if (canUse(PermissionKey.TRACK_WORK)) {
    maintenanceLinks.push({ label: "Track Work", href: "/tracking", icon: Search, nested: true, parentSectionId: "maintenance" });
  }

  if (canUse(PermissionKey.VIEW_NOTIFICATIONS)) {
    maintenanceLinks.push({ label: "Notifications", href: "/notifications", icon: Bell, nested: true, parentSectionId: "maintenance" });
  }

  if (canUse(PermissionKey.VIEW_REPORTS)) {
    maintenanceLinks.push({ label: "Report", href: "/reports", icon: FileSpreadsheet, nested: true, parentSectionId: "maintenance" });
  }

  if (maintenanceLinks.length > 0) {
    baseLinks.push({ label: "Maintenance", kind: "section", icon: Wrench, sectionId: "maintenance" }, ...maintenanceLinks);
  }

  baseLinks.push(
    { label: "Assets", kind: "section", icon: Boxes, sectionId: "assets" },
    { label: "Assets", href: "#", icon: Boxes, nested: true, disabled: true, parentSectionId: "assets" },
    { label: "Equipment", href: "#", icon: Factory, nested: true, disabled: true, parentSectionId: "assets" },
    { label: "Preventive Maintenance", href: "#", icon: ClipboardList, nested: true, disabled: true, parentSectionId: "assets" },
    { label: "Meter Reading", href: "#", icon: CalendarDays, nested: true, disabled: true, parentSectionId: "assets" },
  );

  const organizationLinks: AppLink[] = [];
  if (canUse(PermissionKey.VIEW_MEMBERS)) {
    organizationLinks.push({ label: "Members", href: "/members", icon: UsersRound, nested: true, parentSectionId: "organization" });
  }
  if (canUse(PermissionKey.MANAGE_COMPANY_ORGANIZATION) || canUse(PermissionKey.MANAGE_PLANT_PROFILE)) {
    organizationLinks.unshift({ label: "Organizations", href: "/admin/organization", icon: Building2, nested: true, parentSectionId: "organization" });
  }
  if (role === RoleName.ADMIN || role === RoleName.ORGANIZATION_ADMIN) {
    organizationLinks.push({ label: "Sites", href: "/admin/sites", icon: Factory, nested: true, parentSectionId: "organization" });
  }
  if (canUse(PermissionKey.MANAGE_SITE_ADMIN_PERMISSION)) {
    organizationLinks.push({ label: "Site Admin Permissions", href: "/admin/site-admin-permissions", icon: ShieldCheck, nested: true, parentSectionId: "organization" });
  }

  if (organizationLinks.length > 0) {
    baseLinks.push({ label: "Organization", kind: "section", icon: Building2, sectionId: "organization" }, ...organizationLinks);
  }

  baseLinks.push(
    { label: "Inventory", kind: "section", icon: Archive, sectionId: "inventory" },
    inventoryLink(
      { label: "Spare Parts", href: "/inventory/spare-parts", icon: Package, nested: true, parentSectionId: "inventory" },
      canUseAny(PermissionKey.MANAGE_SPARE_PARTS, PermissionKey.VIEW_STORE_STOCK),
    ),
    inventoryLink(
      { label: "Stock (คลังอะไหล่)", href: "/inventory/stock", icon: Boxes, nested: true, parentSectionId: "inventory" },
      canUseAny(PermissionKey.VIEW_STORE_STOCK, PermissionKey.ADJUST_STOCK),
    ),
    inventoryLink(
      { label: "Issue", href: "/inventory/issue", icon: ArrowUpFromLine, nested: true, parentSectionId: "inventory" },
      canUseAny(PermissionKey.CREATE_STORE_ISSUE, PermissionKey.APPROVE_STORE_ISSUE, PermissionKey.ISSUE_STOCK),
    ),
    inventoryLink(
      { label: "Receive", href: "/inventory/receive", icon: ArrowDownToLine, nested: true, parentSectionId: "inventory" },
      canUse(PermissionKey.RECEIVE_STOCK),
    ),
    inventoryLink(
      { label: "Store Tracking", href: "/inventory/tracking", icon: Search, nested: true, parentSectionId: "inventory" },
      canUse(PermissionKey.VIEW_STORE_TRACKING),
    ),
    inventoryLink(
      { label: "Stock Movement ล่าสุด", href: "/inventory/movements", icon: History, nested: true, parentSectionId: "inventory" },
      canUseAny(PermissionKey.VIEW_STORE_STOCK, PermissionKey.VIEW_STORE_REPORTS, PermissionKey.ADJUST_STOCK),
    ),
    inventoryLink(
      { label: "Store Reports", href: "/inventory/reports", icon: FileSpreadsheet, nested: true, parentSectionId: "inventory" },
      canUse(PermissionKey.VIEW_STORE_REPORTS),
    ),
  );

  const masterDataLinks: AppLink[] = [];
  if (canUse(PermissionKey.MANAGE_CATEGORY)) {
    masterDataLinks.push({ label: "Categories", href: "/admin/categories", icon: Tags, nested: true, parentSectionId: "master-data" });
  }
  if (canUse(PermissionKey.MANAGE_ZONE)) {
    masterDataLinks.push({ label: "Zones", href: "/admin/zones", icon: Factory, nested: true, parentSectionId: "master-data" });
  }
  if (canUse(PermissionKey.MANAGE_QR_CODE)) {
    masterDataLinks.push({ label: "QR Codes", href: "/admin/qr-code", icon: Search, nested: true, parentSectionId: "master-data" });
  }
  if (canUse(PermissionKey.MANAGE_SLA_DUE_DATE)) {
    masterDataLinks.push({ label: "SLA Settings", href: "/admin/sla", icon: CalendarDays, nested: true, parentSectionId: "master-data" });
  }
  if (masterDataLinks.length > 0) {
    baseLinks.push({ label: "Master Data", kind: "section", icon: Tags, sectionId: "master-data" }, ...masterDataLinks);
  }

  const communicationLinks: AppLink[] = [];
  if (canUse(PermissionKey.MANAGE_ANNOUNCEMENTS)) {
    communicationLinks.push({ label: "Announcements", href: "/admin/announcements", icon: Megaphone, nested: true, parentSectionId: "communication" });
  }
  if (canUse(PermissionKey.VIEW_FEEDBACK_ALL_PLANTS)) {
    communicationLinks.push({ label: "Feedback", href: "/admin/feedback", icon: MessageSquareText, nested: true, parentSectionId: "communication" });
  }
  if (communicationLinks.length > 0) {
    baseLinks.push({ label: "Communication", kind: "section", icon: MessageCircleMore, sectionId: "communication" }, ...communicationLinks);
  }

  const administrationLinks: AppLink[] = [];
  if (role === RoleName.ADMIN) {
    administrationLinks.push({ label: "Status", href: "/admin/status", icon: Activity, nested: true, parentSectionId: "administration" });
  }
  if (canUse(PermissionKey.MANAGE_USERS_ALL_PLANTS) || canUse(PermissionKey.MANAGE_USERS_PLANT)) {
    administrationLinks.push({ label: "Admin Users", href: "/admin/users", icon: Settings, nested: true, parentSectionId: "administration" });
  }
  if (canUse(PermissionKey.MANAGE_SYSTEM_SETTINGS) || canUse(PermissionKey.MANAGE_ENGINEER_ASSIGNMENT)) {
    administrationLinks.push({ label: "System Settings", href: "/admin/settings", icon: SlidersHorizontal, nested: true, parentSectionId: "administration" });
  }
  if (canUse(PermissionKey.MANAGE_LINE_SETTINGS)) {
    administrationLinks.push({ label: "LINE Settings", href: "/admin/line", icon: MessageCircleMore, nested: true, parentSectionId: "administration" });
  }
  if (canUse(PermissionKey.VIEW_AUDIT_LOG_ALL_PLANTS) || canUse(PermissionKey.VIEW_AUDIT_LOG_PLANT)) {
    administrationLinks.push({ label: "History", href: "/admin/history", icon: History, nested: true, parentSectionId: "administration" });
  }
  if (administrationLinks.length > 0) {
    baseLinks.push({ label: "Administration", kind: "section", icon: Settings, sectionId: "administration" }, ...administrationLinks);
  }

  baseLinks.push({ label: "Profile", href: "/profile", icon: UserRound });
  baseLinks.push({ label: "Logout", href: "/logout", icon: LogOut, accent: "danger" });

  return baseLinks;
}

export function AppNavLinks({
  role,
  permissionContext,
  onNavigate,
  collapsed = false,
}: {
  role: RoleValue;
  permissionContext?: AppPermissionContext;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const links = getAppLinks(role, permissionContext);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    links.reduce<Record<string, boolean>>((sections, link, _index, allLinks) => {
      const sectionParents = new Map(
        allLinks
          .filter((candidate) => candidate.kind === "section" && candidate.sectionId)
          .map((candidate) => [candidate.sectionId as string, candidate.parentSectionId]),
      );
      const openParentChain = (sectionId?: string) => {
        if (!sectionId) return;
        sections[sectionId] = true;
        openParentChain(sectionParents.get(sectionId));
      };
      if (link.parentSectionId && link.href && !link.disabled && isActivePath(pathname, link.href)) {
        openParentChain(link.parentSectionId);
      }
      return sections;
    }, {}),
  );

  const isChildOfSection = (parentSectionId: string | undefined, sectionId: string): boolean => {
    if (!parentSectionId) return false;
    if (parentSectionId === sectionId) return true;
    const parentSection = links.find((link) => link.kind === "section" && link.sectionId === parentSectionId);
    return isChildOfSection(parentSection?.parentSectionId, sectionId);
  };

  return (
    <>
      {links.map((item) => {
        if (item.kind === "section") {
          if (item.nested && !(openSections[item.parentSectionId ?? ""] ?? false)) return null;
          if (collapsed && item.nested) return null;
          const Icon = item.icon;
          const sectionId = item.sectionId ?? item.label;
          const sectionOpen = openSections[sectionId] ?? false;
          const sectionActive = links.some((link) => link.href && !link.disabled && isActivePath(pathname, link.href) && isChildOfSection(link.parentSectionId, sectionId));
          const isSubmenuSection = Boolean(item.nested);
          const sectionIndent = collapsed ? "" : item.depth === 2 ? "ml-10" : item.nested ? "ml-6" : "";
          const sectionWeight = isSubmenuSection ? "font-medium" : "font-bold";
          return (
            <button
              key={navItemKey(item)}
              aria-expanded={sectionOpen}
              aria-label={item.label}
              className={`mt-2 flex w-full items-center rounded-xl text-sm ${sectionWeight} transition hover:bg-[var(--soft)] ${
                collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3 text-left"
              } ${sectionIndent} ${
                sectionOpen || sectionActive
                  ? "bg-[var(--soft)] text-[var(--ink)]"
                  : "text-[var(--ink)]"
              }`}
              title={collapsed ? item.label : undefined}
              type="button"
              onClick={() => setOpenSections((current) => ({ ...current, [sectionId]: !sectionOpen }))}
            >
              {!collapsed && isSubmenuSection ? (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
                  data-nav-submenu-bullet="true"
                />
              ) : null}
              {!collapsed && !isSubmenuSection ? (
                <ChevronRight
                  aria-hidden="true"
                  className={`shrink-0 text-[var(--primary)] transition-transform duration-200 ${
                    sectionOpen ? "rotate-90" : ""
                  }`}
                  size={17}
                />
              ) : null}
              {!isSubmenuSection && Icon ? <Icon aria-hidden="true" size={17} className="shrink-0 text-[var(--primary)]" /> : null}
              {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
              {!collapsed && isSubmenuSection ? (
                <ChevronRight
                  aria-hidden="true"
                  className={`shrink-0 text-[var(--primary)] transition-transform duration-200 ${
                    sectionOpen ? "rotate-90" : ""
                  }`}
                  size={14}
                />
              ) : null}
            </button>
          );
        }

        if (item.nested && !(openSections[item.parentSectionId ?? ""] ?? false)) return null;

        const Icon = item.icon;
        const active = item.href && !item.disabled ? isActivePath(pathname, item.href) : false;
        const isDanger = item.accent === "danger";
        const isSubmenu = Boolean(item.nested);
        const indent = collapsed ? "" : item.depth === 2 ? "ml-10" : item.nested ? "ml-6" : "";
        const textWeight = isSubmenu ? "font-medium" : "font-bold";
        const className = isDanger
          ? `mt-4 flex items-center rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3"}`
          : item.disabled
            ? `flex cursor-not-allowed items-center rounded-xl text-sm ${textWeight} text-[var(--muted)] opacity-60 ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3"} ${indent}`
          : active
            ? `flex items-center rounded-xl bg-[var(--soft)] text-sm ${textWeight} ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3"} ${indent}`
            : `flex items-center rounded-xl text-sm ${textWeight} hover:bg-[var(--soft)] ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3"} ${indent}`;

        if (item.disabled) {
          return (
            <span
              key={navItemKey(item)}
              aria-disabled="true"
              className={className}
              title={collapsed ? `${item.label} - Coming soon` : "Coming soon"}
            >
              {!isSubmenu && Icon ? <Icon aria-hidden="true" size={17} className="text-[var(--muted)]" /> : null}
              {isSubmenu ? (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]"
                  data-nav-submenu-bullet="true"
                />
              ) : null}
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span className="rounded-full bg-[var(--soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">Soon</span>
                </>
              ) : null}
            </span>
          );
        }

        return (
          <Link
            key={navItemKey(item)}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={className}
            href={item.href ?? "#"}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
          >
            {!isSubmenu && Icon ? <Icon aria-hidden="true" size={17} className={isDanger ? "" : "text-[var(--primary)]"} /> : null}
            {isSubmenu ? (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
                data-nav-submenu-bullet="true"
              />
            ) : null}
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </>
  );
}

function isActivePath(pathname: string, href: string) {
  const cleanHref = href.split("#")[0];
  if (!cleanHref || cleanHref === "#") return false;
  return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
}

function navItemKey(item: AppLink) {
  if (item.kind === "section") return `section:${item.sectionId ?? item.label}:${item.parentSectionId ?? "root"}`;
  return `link:${item.parentSectionId ?? "root"}:${item.href ?? "no-href"}:${item.label}`;
}
