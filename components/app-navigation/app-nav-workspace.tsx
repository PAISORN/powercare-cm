"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import type { RoleName as RoleValue } from "../../modules/cm-work/cm-work-types";
import { LogoutMenuItem } from "../logout-menu-item";
import {
  getAppLinks,
  isActivePath,
  isMostSpecificActiveLink,
  type AppLink,
  type AppPermissionContext,
} from "./app-navigation-model";
import {
  getOpenSectionsForRoute,
  isChildOfSection,
} from "./app-navigation-route-state";

export function AppNavLinks({
  role,
  permissionContext,
  onNavigate,
  collapsed = false,
  treeStyle = false,
}: {
  role: RoleValue;
  permissionContext?: AppPermissionContext;
  onNavigate?: () => void;
  collapsed?: boolean;
  treeStyle?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const links = getAppLinks(role, permissionContext);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => getOpenSectionsForRoute(links, pathname, searchParams),
  );
  const searchKey = searchParams?.toString() ?? "";

  useEffect(() => {
    const activeSections = getOpenSectionsForRoute(
      links,
      pathname,
      searchParams,
    );
    setOpenSections((current) => ({ ...current, ...activeSections }));
    // Route changes should reveal their active branch without resetting choices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchKey]);

  return (
    <>
      {links.map((item, itemIndex) => {
        if (item.kind === "section") {
          if (
            item.nested &&
            !(openSections[item.parentSectionId ?? ""] ?? false)
          )
            return null;
          if (collapsed && item.nested) return null;
          const Icon = item.icon;
          const sectionId = item.sectionId ?? item.label;
          const sectionOpen = openSections[sectionId] ?? false;
          const sectionActive = links.some(
            (link) =>
              link.href &&
              !link.disabled &&
              isActivePath(pathname, link.href, searchParams) &&
              isChildOfSection(links, link.parentSectionId, sectionId),
          );
          const isSubmenuSection = Boolean(item.nested);
          const sectionIndent =
            collapsed || treeStyle
              ? ""
              : item.depth === 2
                ? "ml-10"
                : item.nested
                  ? "ml-6"
                  : "";
          const sectionWeight = isSubmenuSection ? "font-medium" : "font-bold";
          return (
            <NavTreeBranch
              enabled={treeStyle && !collapsed && Boolean(item.nested)}
              isLast={isLastDirectChild(links, item, itemIndex)}
              key={navItemKey(item)}
            >
              <button
                aria-expanded={sectionOpen}
                aria-label={item.label}
                className={`mt-2 flex w-full items-center rounded-xl text-sm ${sectionWeight} transition hover:bg-[var(--soft)] ${
                  collapsed
                    ? "justify-center px-2 py-3"
                    : "gap-3 px-3 py-3 text-left"
                } ${sectionIndent} ${
                  sectionOpen || sectionActive
                    ? "bg-[var(--soft)] text-[var(--ink)]"
                    : "text-[var(--ink)]"
                }`}
                title={collapsed ? item.label : undefined}
                type="button"
                onClick={() =>
                  setOpenSections((current) => ({
                    ...current,
                    [sectionId]: !sectionOpen,
                  }))
                }
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
                {!isSubmenuSection && Icon ? (
                  <Icon
                    aria-hidden="true"
                    size={17}
                    className="shrink-0 text-[var(--primary)]"
                  />
                ) : null}
                {!collapsed ? (
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                ) : null}
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
            </NavTreeBranch>
          );
        }

        if (item.nested && !(openSections[item.parentSectionId ?? ""] ?? false))
          return null;

        const Icon = item.icon;
        const active =
          isMostSpecificActiveLink(links, item, pathname, searchParams);
        const isDanger = item.accent === "danger";
        const isSubmenu = Boolean(item.nested);
        const indent =
          collapsed || treeStyle
            ? ""
            : item.depth === 2
              ? "ml-10"
              : item.nested
                ? "ml-6"
                : "";
        const textWeight = isSubmenu ? "font-medium" : "font-bold";
        const className = isDanger
          ? `mt-4 flex items-center rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3"}`
          : item.disabled
            ? `flex cursor-not-allowed items-center rounded-xl text-sm ${textWeight} text-[var(--muted)] opacity-60 ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3"} ${indent}`
            : active
              ? `flex items-center rounded-xl bg-[var(--soft)] text-sm ${textWeight} ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3"} ${indent}`
              : `flex items-center rounded-xl text-sm ${textWeight} hover:bg-[var(--soft)] ${collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3"} ${indent}`;

        if (isDanger) {
          return (
            <LogoutMenuItem collapsed={collapsed} key={navItemKey(item)} />
          );
        }

        if (item.disabled) {
          return (
            <NavTreeBranch
              enabled={treeStyle && !collapsed && Boolean(item.nested)}
              isLast={isLastDirectChild(links, item, itemIndex)}
              key={navItemKey(item)}
            >
              <span
                aria-disabled="true"
                className={className}
                title={
                  collapsed ? `${item.label} - Coming soon` : "Coming soon"
                }
              >
                {!isSubmenu && Icon ? (
                  <Icon
                    aria-hidden="true"
                    size={17}
                    className="text-[var(--muted)]"
                  />
                ) : null}
                {isSubmenu ? (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--muted)]"
                    data-nav-submenu-bullet="true"
                  />
                ) : null}
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>
                    <span className="rounded-full bg-[var(--soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">
                      Soon
                    </span>
                  </>
                ) : null}
              </span>
            </NavTreeBranch>
          );
        }

        return (
          <NavTreeBranch
            enabled={treeStyle && !collapsed && Boolean(item.nested)}
            isLast={isLastDirectChild(links, item, itemIndex)}
            key={navItemKey(item)}
          >
            <Link
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={className}
              href={item.href ?? "#"}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
            >
              {!isSubmenu && Icon ? (
                <Icon
                  aria-hidden="true"
                  size={17}
                  className={isDanger ? "" : "text-[var(--primary)]"}
                />
              ) : null}
              {isSubmenu ? (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]"
                  data-nav-submenu-bullet="true"
                />
              ) : null}
              {!collapsed ? (
                <span className="truncate">{item.label}</span>
              ) : null}
            </Link>
          </NavTreeBranch>
        );
      })}
    </>
  );
}
function NavTreeBranch({
  children,
  enabled,
  isLast,
}: {
  children: ReactNode;
  enabled: boolean;
  isLast: boolean;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <div
      className={`relative ml-5 pl-6 before:pointer-events-none before:absolute before:left-0 before:-top-2 before:border-l before:border-[var(--line)] after:pointer-events-none after:absolute after:left-0 after:top-1/2 after:w-6 after:border-t after:border-[var(--line)] ${
        isLast ? "before:h-[calc(50%+0.5rem)]" : "before:-bottom-2"
      }`}
      data-nav-tree-branch="true"
      data-nav-tree-last={isLast ? "true" : "false"}
    >
      {children}
    </div>
  );
}

function isLastDirectChild(links: AppLink[], item: AppLink, itemIndex: number) {
  if (!item.nested || !item.parentSectionId) return false;
  return !links
    .slice(itemIndex + 1)
    .some((candidate) => candidate.parentSectionId === item.parentSectionId);
}
function navItemKey(item: AppLink) {
  if (item.kind === "section")
    return `section:${item.sectionId ?? item.label}:${item.parentSectionId ?? "root"}`;
  return `link:${item.parentSectionId ?? "root"}:${item.href ?? "no-href"}:${item.label}`;
}
