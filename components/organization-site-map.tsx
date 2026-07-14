"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  KeyRound,
  Factory,
  Maximize2,
  Minimize2,
  Move,
  PlusCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Upload,
  X,
  Users,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminUserRoleScopeController } from "./admin-user-role-scope-controller";
import { ProfilePhotoPreview } from "./profile-photo-preview";
import { UserAvatar } from "./user-avatar";
import { isSiteAdminRole, RoleName } from "../modules/cm-work/cm-work-types";

type ChartUser = {
  id: string;
  username: string;
  fullName: string;
  department?: string | null;
  role: string;
  organizationId?: string | null;
  plantId?: string | null;
  categoryId?: string | null;
  active?: boolean;
  category?: { name: string } | null;
  categories?: { categoryId: string; category: { name: string } }[];
  signature?: { updatedAt?: Date | string; uploadedAt?: Date | string } | null;
  profilePhoto?: { updatedAt?: Date | string } | null;
};

type ChartSite = {
  id: string;
  code: string;
  name: string;
  users: ChartUser[];
  _count: { users: number; works: number; zones: number };
};

type ChartOrganization = {
  id: string;
  name: string;
  slug: string;
  users: ChartUser[];
  plants: ChartSite[];
};

type ViewMode = "horizontal" | "vertical";

type ScopeOption = { id: string; name: string; organizationId?: string | null; plantId?: string | null };
type OrganizationOption = { id: string; name: string };
type RoleOption = { value: string; label: string };
type UserPermissions = {
  canCreate: boolean;
  canUpdate: boolean;
  canResetPassword: boolean;
  canAssignRole: boolean;
  canAssignPlant: boolean;
  canAssignCategories: boolean;
  canDeactivate: boolean;
};
type CreateUserContext = {
  title: "Create Organization Admin" | "Create Site Admin";
  role: string;
  organizationId: string;
  organizationName: string;
  plantId?: string | null;
  plantName?: string | null;
  department: string;
};

const minimalShell =
  "minimal-shell rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(15,23,42,0.06)]";
const minimalPanel =
  "minimal-panel border border-[var(--line)] bg-[var(--surface)] shadow-[0_4px_16px_rgba(15,23,42,0.04)]";
const minimalNode =
  "minimal-node border border-[var(--line)] bg-[var(--surface)] shadow-[0_6px_18px_rgba(15,23,42,0.05)]";
const minimalControl =
  "border border-[var(--line)] bg-[var(--surface)] shadow-[0_2px_8px_rgba(15,23,42,0.04)]";
const chartLine = "bg-[color-mix(in_srgb,var(--line)_58%,var(--ink)_42%)]";
const hierarchyAccent = {
  owner: "bg-violet-600",
  organization: "bg-blue-500",
  organizationAdmin: "bg-indigo-500",
  site: "bg-emerald-500",
  siteAdmin: "bg-amber-500",
  member: "bg-slate-400",
  public: "bg-cyan-500",
};

export function OrganizationSiteMap({
  categories = [],
  organizationName = "",
  organizationTree,
  organizations = [],
  plants = [],
  roleOptions = [],
  totalSites,
  createUserAction,
  updateUserAction,
  userPermissions,
  viewerRole = RoleName.ADMIN,
}: {
  categories?: ScopeOption[];
  organizationName?: string;
  organizationTree: ChartOrganization[];
  organizations?: OrganizationOption[];
  plants?: ScopeOption[];
  roleOptions?: RoleOption[];
  totalSites: number;
  createUserAction?: (formData: FormData) => void | Promise<void>;
  updateUserAction?: (formData: FormData) => void | Promise<void>;
  userPermissions?: UserPermissions;
  viewerRole?: string;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const chartFrameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("horizontal");
  const [query, setQuery] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ownerRail, setOwnerRail] = useState<{ left: number; width: number } | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChartUser | null>(null);
  const [selectedCreateUser, setSelectedCreateUser] = useState<CreateUserContext | null>(null);
  const showOwnerNode = viewerRole === RoleName.ADMIN;
  const showOrganizationLevel = !isSiteAdminRole(viewerRole);

  const allBranchIds = useMemo(() => {
    const ids: string[] = [];
    organizationTree.forEach((organization) => {
      ids.push(`org:${organization.id}`);
      organization.plants.forEach((site) => ids.push(`site:${site.id}`));
    });
    return ids;
  }, [organizationTree]);

  const filteredTree = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return organizationTree
      .map((organization) => {
        const organizationMatch = textMatches(needle, organization.name, organization.slug);
        const organizationAdmins = organization.users.filter((user) => userMatches(user, needle, activeOnly));
        const plants = organization.plants
          .map((site) => {
            const siteMatch = textMatches(needle, site.name, site.code);
            const users = site.users.filter((user) => userMatches(user, needle, activeOnly));
            return { ...site, users, __visible: !needle || siteMatch || users.length > 0 || organizationMatch };
          })
          .filter((site) => site.__visible);

        return {
          ...organization,
          users: organizationAdmins,
          plants,
          __visible: !needle || organizationMatch || organizationAdmins.length > 0 || plants.length > 0,
        };
      })
      .filter((organization) => organization.__visible);
  }, [activeOnly, organizationTree, query]);

  useEffect(() => {
    const frame = chartFrameRef.current;
    if (!showOwnerNode || !frame || viewMode !== "horizontal" || filteredTree.length < 2) {
      setOwnerRail(null);
      return;
    }

    const updateOwnerRail = () => {
      const organizationCards = [...frame.querySelectorAll<HTMLElement>("[data-org-card='true']")];
      if (organizationCards.length < 2) {
        setOwnerRail(null);
        return;
      }

      const frameRect = frame.getBoundingClientRect();
      const centers = organizationCards.map((card) => {
        const rect = card.getBoundingClientRect();
        return (rect.left + rect.width / 2 - frameRect.left) / zoom;
      });
      const left = Math.min(...centers);
      const right = Math.max(...centers);
      setOwnerRail({ left, width: right - left });
    };

    updateOwnerRail();
    const resizeObserver = new ResizeObserver(updateOwnerRail);
    resizeObserver.observe(frame);
    frame.querySelectorAll<HTMLElement>("[data-org-card='true']").forEach((card) => resizeObserver.observe(card));
    window.addEventListener("resize", updateOwnerRail);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateOwnerRail);
    };
  }, [filteredTree, showOwnerNode, viewMode, zoom]);

  const setCollapsed = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(allBranchIds));
  const fitScreen = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const canOpenUserDrawer = Boolean(updateUserAction && userPermissions?.canUpdate);
  const canCreateAdminFromMap = Boolean(
    createUserAction &&
      userPermissions?.canCreate &&
      userPermissions?.canAssignRole &&
      userPermissions?.canAssignPlant,
  );

  const requestFullscreen = async () => {
    if (!canvasRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
      return;
    }
    await canvasRef.current.requestFullscreen();
    setIsFullscreen(true);
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const dragCanvas = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    dragRef.current = { ...drag, x: event.clientX, y: event.clientY };
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) dragRef.current = null;
  };

  return (
    <section className={`mt-6 p-4 md:p-6 ${minimalShell}`}>
      <div className="org-chart-toolbar flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
            <Factory aria-hidden="true" size={17} />
            Organization Site Map
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">Company structure</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">คลิกกล่องในผังเพื่อไปยัง Organization, Site หรือ User ที่เกี่ยวข้อง</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <select
            aria-label="View selector"
            className={`min-h-10 rounded-lg px-3 text-sm font-bold text-[var(--ink)] ${minimalControl}`}
            onChange={(event) => setViewMode(event.target.value as ViewMode)}
            value={viewMode}
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
          <label className="relative min-w-0 flex-1 md:w-72 md:flex-none">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
            <input
              aria-label="Search organization, site, or user"
              className={`min-h-10 w-full rounded-lg pl-9 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] ${minimalControl}`}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search organization, site, or user"
              value={query}
            />
          </label>
          <ToolbarButton active={activeOnly} label="Filter active" onClick={() => setActiveOnly((value) => !value)}>
            <SlidersHorizontal aria-hidden="true" size={17} />
          </ToolbarButton>
          <ToolbarButton label="Expand All" onClick={expandAll}>Expand</ToolbarButton>
          <ToolbarButton label="Collapse All" onClick={collapseAll}>Collapse</ToolbarButton>
          <ToolbarButton label="Refresh" onClick={() => router.refresh()}>
            <RefreshCw aria-hidden="true" size={17} />
          </ToolbarButton>
        </div>
      </div>

      <div
        ref={canvasRef}
        className={`org-chart-canvas mt-5 overflow-hidden rounded-xl bg-[var(--soft)] p-3 md:p-5 ${minimalPanel}`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[var(--muted)] ${minimalControl}`}>
            <Move aria-hidden="true" size={15} />
            Drag canvas
          </span>
          <div className="flex flex-wrap gap-2">
            <ToolbarButton label="Zoom Out" onClick={() => setZoom((value) => clampZoom(value - 0.1))}>
              <ZoomOut aria-hidden="true" size={17} />
            </ToolbarButton>
            <span className={`grid min-h-9 min-w-16 place-items-center rounded-lg px-3 text-xs font-black text-[var(--ink)] ${minimalControl}`}>
              {Math.round(zoom * 100)}%
            </span>
            <ToolbarButton label="Zoom In" onClick={() => setZoom((value) => clampZoom(value + 0.1))}>
              <ZoomIn aria-hidden="true" size={17} />
            </ToolbarButton>
            <ToolbarButton label="Fit Screen" onClick={fitScreen}>Fit</ToolbarButton>
            <ToolbarButton label="Fullscreen" onClick={requestFullscreen}>
              {isFullscreen ? <Minimize2 aria-hidden="true" size={17} /> : <Maximize2 aria-hidden="true" size={17} />}
            </ToolbarButton>
          </div>
        </div>

        <div
          className="min-h-[620px] cursor-grab overflow-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 active:cursor-grabbing md:p-8"
          onPointerCancel={endDrag}
          onPointerDown={startDrag}
          onPointerMove={dragCanvas}
          onPointerUp={endDrag}
        >
          <div
            className="origin-top transition-transform duration-200"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <div className={`${viewMode === "horizontal" ? "min-w-max" : "min-w-[760px]"} max-md:min-w-[620px]`}>
              {showOwnerNode ? (
                <>
                  <div className="flex justify-center">
                    <PersonNode
                      accentClassName={hierarchyAccent.owner}
                      href="/admin/users"
                      roleLabel="Owner Admin"
                      title="Owner Admin"
                      subtitle="PowerCare.CM Platform"
                      variant="owner"
                    />
                  </div>
                  <Connector />
                </>
              ) : null}
              <div className="flex justify-center">
                <div ref={chartFrameRef} className={viewMode === "horizontal" ? "relative w-max pt-8" : "relative mx-auto w-fit pt-8"}>
                  {showOwnerNode && ownerRail ? (
                    <span
                      aria-hidden="true"
                      className={`org-chart-rail absolute top-0 h-[3px] rounded-full max-md:hidden ${chartLine}`}
                      style={{ left: `${ownerRail.left}px`, width: `${ownerRail.width}px` }}
                    />
                  ) : null}

                <div className={viewMode === "horizontal" ? "flex w-max items-start justify-center gap-8 max-md:flex-col max-md:items-center" : "mx-auto grid max-w-[720px] gap-8"}>
                  {filteredTree.map((organizationItem) => {
                    const orgId = `org:${organizationItem.id}`;
                    const orgCollapsed = collapsedIds.has(orgId);
                    const organizationAdmins = organizationItem.users;
                    const organizationHasAdmin = organizationAdmins.length > 0;

                    if (!showOrganizationLevel) {
                      return (
                        <div className="relative w-fit shrink-0" key={organizationItem.id}>
                          <div className="site-branch-row relative flex w-max justify-center gap-5 overflow-visible pb-2">
                            {organizationItem.plants.length > 0 ? (
                              organizationItem.plants.map((site) => (
                                <div className="relative w-[340px] shrink-0" key={site.id}>
                                  <SiteBranch
                                    canCreateAdminFromMap={canCreateAdminFromMap}
                                    canOpenUserDrawer={canOpenUserDrawer}
                                    collapsedIds={collapsedIds}
                                    onCreateUser={setSelectedCreateUser}
                                    onSelectUser={setSelectedUser}
                                    organizationId={organizationItem.id}
                                    organizationName={organizationItem.name}
                                    setCollapsed={setCollapsed}
                                    site={site}
                                  />
                                </div>
                              ))
                            ) : (
                              <EmptyNode text="No Site" />
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="relative w-fit shrink-0" key={organizationItem.id}>
                        {filteredTree.length > 1 ? (
                          <span aria-hidden="true" className={`absolute left-1/2 top-[-2rem] h-8 w-[3px] -translate-x-1/2 rounded-full max-md:hidden ${chartLine}`} />
                        ) : null}
                        <article id={`organization-${organizationItem.id}`} className={`org-chart-branch w-fit min-w-[390px] animate-[fadeIn_200ms_ease-out] rounded-xl p-4 ${minimalPanel}`}>
                          <div className="flex justify-center">
                             <StructureNode
                               dataOrgCard
                               adminNames={organizationAdmins.map((admin) => admin.fullName)}
                               adminRoleLabel="Organization Admin"
                               adminUser={organizationAdmins[0]}
                               accentClassName={organizationHasAdmin ? hierarchyAccent.organization : "bg-slate-300"}
                               href={`/admin/organization#organization-${organizationItem.id}`}
                               label="Organization"
                               muted={!organizationHasAdmin}
                               onAdminSelect={canOpenUserDrawer && organizationAdmins[0] ? () => setSelectedUser(organizationAdmins[0]) : undefined}
                               onCreateAdmin={
                                 canCreateAdminFromMap && !organizationAdmins[0]
                                   ? () =>
                                       setSelectedCreateUser({
                                         title: "Create Organization Admin",
                                         role: RoleName.ORGANIZATION_ADMIN,
                                         organizationId: organizationItem.id,
                                         organizationName: organizationItem.name,
                                         plantId: null,
                                         plantName: null,
                                         department: organizationItem.name,
                                       })
                                   : undefined
                               }
                               onToggle={() => setCollapsed(orgId)}
                               open={!orgCollapsed}
                               subtitle={`${organizationItem.slug} - ${organizationItem.plants.length} sites`}
                              title={organizationItem.name}
                              type="organization"
                            />
                          </div>
                          {!orgCollapsed ? (
                            <>
                              <Connector />
                              <div className="site-branch-row relative flex w-max justify-center gap-5 overflow-visible pb-2">
                                {organizationItem.plants.length > 1 ? (
                                  <span
                                    aria-hidden="true"
                                    className={`absolute left-1/2 top-0 h-[3px] w-[calc(100%-340px)] min-w-0 -translate-x-1/2 rounded-full ${chartLine}`}
                                  />
                                ) : null}
                                {organizationItem.plants.length > 0 ? (
                                  organizationItem.plants.map((site) => (
                                    <div className="relative w-[340px] shrink-0 pt-8" key={site.id}>
                                      {organizationItem.plants.length > 1 ? (
                                        <span aria-hidden="true" className={`absolute left-1/2 top-0 h-8 w-[3px] -translate-x-1/2 rounded-full ${chartLine}`} />
                                      ) : null}
                                      <SiteBranch
                                        canCreateAdminFromMap={canCreateAdminFromMap}
                                        canOpenUserDrawer={canOpenUserDrawer}
                                        collapsedIds={collapsedIds}
                                        onCreateUser={setSelectedCreateUser}
                                        onSelectUser={setSelectedUser}
                                        organizationId={organizationItem.id}
                                        organizationName={organizationItem.name}
                                        setCollapsed={setCollapsed}
                                        site={site}
                                      />
                                    </div>
                                  ))
                                ) : (
                                  <EmptyNode text="No Site" />
                                )}
                              </div>
                            </>
                          ) : null}
                        </article>
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <OrganizationUserDrawer
        action={updateUserAction}
        categories={categories}
        onClose={() => setSelectedUser(null)}
        open={Boolean(selectedUser)}
        organizationName={organizationName}
        organizations={organizations}
        plants={plants}
        roleOptions={roleOptions}
        user={selectedUser}
        userPermissions={userPermissions}
      />
      <OrganizationCreateUserDrawer
        action={createUserAction}
        categories={categories}
        context={selectedCreateUser}
        onClose={() => setSelectedCreateUser(null)}
        open={Boolean(selectedCreateUser)}
        organizationName={organizationName}
        userPermissions={userPermissions}
      />
    </section>
  );
}

function SiteBranch({
  canCreateAdminFromMap,
  canOpenUserDrawer,
  collapsedIds,
  onCreateUser,
  onSelectUser,
  organizationId,
  organizationName,
  setCollapsed,
  site,
}: {
  canCreateAdminFromMap: boolean;
  canOpenUserDrawer: boolean;
  collapsedIds: Set<string>;
  onCreateUser: (context: CreateUserContext) => void;
  onSelectUser: (user: ChartUser) => void;
  organizationId: string;
  organizationName: string;
  setCollapsed: (id: string) => void;
  site: ChartSite;
}) {
  const siteId = `site:${site.id}`;
  const siteCollapsed = collapsedIds.has(siteId);
  const siteAdmins = site.users.filter((member) => isSiteAdminRole(member.role));
  const siteHasAdmin = siteAdmins.length > 0;
  const siteMembers = site.users.filter(
    (member) =>
      member.role !== RoleName.ADMIN &&
      member.role !== RoleName.ORGANIZATION_ADMIN &&
      !isSiteAdminRole(member.role),
  );
  const visibleMembers = siteMembers.slice(0, 6);

  return (
    <article className={`org-chart-branch rounded-xl bg-[var(--soft)] p-3 ${minimalPanel}`}>
      <div className="flex justify-center">
          <StructureNode
            adminNames={siteAdmins.map((admin) => admin.fullName)}
            adminRoleLabel="Site Admin"
            adminUser={siteAdmins[0]}
            accentClassName={siteHasAdmin ? hierarchyAccent.site : "bg-slate-300"}
            href={`/admin/sites?organizationId=${organizationId}#site-${site.id}`}
            label="Site"
            muted={!siteHasAdmin}
            onAdminSelect={canOpenUserDrawer && siteAdmins[0] ? () => onSelectUser(siteAdmins[0]) : undefined}
            onCreateAdmin={
              canCreateAdminFromMap && !siteAdmins[0]
                ? () =>
                    onCreateUser({
                      title: "Create Site Admin",
                      role: RoleName.SITE_ADMIN,
                      organizationId,
                      organizationName,
                      plantId: site.id,
                      plantName: site.name,
                      department: site.name,
                    })
                : undefined
            }
            onToggle={() => setCollapsed(siteId)}
            open={!siteCollapsed}
            subtitle={`${site.code} - ${site._count.users} users`}
          title={site.name}
          type="site"
        />
      </div>
      {!siteCollapsed ? (
        <>
          <Connector />
          <SectionLabel>Members</SectionLabel>
          <div className="grid gap-2">
            {visibleMembers.map((member) => (
              <PersonNode
                key={member.id}
                accentClassName={hierarchyAccent.member}
                href={`/admin/users?organizationId=${organizationId}&plantId=${site.id}#user-${member.id}`}
                onSelect={canOpenUserDrawer ? () => onSelectUser(member) : undefined}
                roleLabel="Member"
                status={member.active !== false ? "Active" : "Inactive"}
                subtitle={formatOrgUserCategories(member) || formatRoleNameForChart(member.role)}
                title={member.fullName}
              />
            ))}
            {siteMembers.length > visibleMembers.length ? (
              <PersonNode
                accentClassName={hierarchyAccent.member}
                href={`/admin/users?organizationId=${organizationId}&plantId=${site.id}`}
                roleLabel="Member"
                subtitle="click to view"
                title={`+${siteMembers.length - visibleMembers.length} members`}
              />
            ) : null}
            <StructureNode
              accentClassName={hierarchyAccent.public}
              href={`/admin/qr-code?plantId=${site.id}`}
              label="Public"
              subtitle="QR / public link"
              title="Public Requester"
              type="public"
            />
          </div>
        </>
      ) : null}
    </article>
  );
}

function ToolbarButton({
  active,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-black transition duration-200 hover:-translate-y-0.5 ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]"
          : `${minimalControl} text-[var(--ink)]`
      }`}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StructureNode({
  adminNames,
  adminRoleLabel,
  adminUser,
  accentClassName,
  dataOrgCard,
  href,
  label,
  muted,
  onAdminSelect,
  onCreateAdmin,
  onToggle,
  open,
  subtitle,
  title,
  type,
}: {
  adminNames?: string[];
  adminRoleLabel?: "Organization Admin" | "Site Admin";
  adminUser?: ChartUser;
  accentClassName: string;
  dataOrgCard?: boolean;
  href: string;
  label: string;
  muted?: boolean;
  onAdminSelect?: () => void;
  onCreateAdmin?: () => void;
  onToggle?: () => void;
  open?: boolean;
  subtitle: string;
  title: string;
  type: "organization" | "site" | "public";
}) {
  const Icon = type === "site" ? Factory : type === "organization" ? Building2 : Users;
  const adminSummary = adminNames && adminNames.length > 0
    ? `${adminNames.slice(0, 2).join(", ")}${adminNames.length > 2 ? ` +${adminNames.length - 2}` : ""}`
    : adminRoleLabel ? `No ${adminRoleLabel}` : "";
  const content = (
    <>
      <span className={`block text-[10px] font-black uppercase tracking-[0.16em] ${muted ? "text-slate-400" : "text-[var(--primary)]"}`}>{label}</span>
      <strong className="mt-0.5 block truncate text-base font-black text-[var(--ink)]">{title}</strong>
      <span className="mt-0.5 block truncate text-xs font-bold text-[var(--muted)]">{subtitle}</span>
      {adminRoleLabel ? (
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${muted ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300" : roleBadgeClass(adminRoleLabel)}`}>{adminRoleLabel}</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${muted ? "text-slate-400" : "text-emerald-600"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${muted ? "bg-slate-400" : "bg-emerald-500"}`} aria-hidden="true" />
            {muted ? "No Admin" : "Active"}
          </span>
        </span>
      ) : null}
      {adminSummary ? (
        <span className="mt-1 block truncate text-[11px] font-semibold text-[var(--muted)]">{adminSummary}</span>
      ) : null}
    </>
  );

  return (
      <div data-org-card={dataOrgCard ? "true" : undefined} className={`org-chart-node ${structureNodeClass(type)} group relative flex w-full max-w-[292px] items-center gap-3 rounded-xl px-4 py-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${minimalNode} ${muted ? "border-slate-300 bg-slate-50/80 opacity-75 dark:border-slate-600 dark:bg-slate-900/40" : ""}`}>
      <span className={`absolute inset-y-3 left-0 w-2 rounded-r-full ${accentClassName}`} aria-hidden="true" />
       <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[var(--soft)] ${muted ? "text-slate-400" : "text-[var(--primary)]"}`}>
        <Icon aria-hidden="true" size={20} />
      </span>
       {onAdminSelect && adminUser ? (
         <button className="min-w-0 flex-1 text-left" type="button" onClick={onAdminSelect}>
           {content}
         </button>
       ) : (
         <Link className="min-w-0 flex-1" href={href}>
           {content}
         </Link>
       )}
      {onCreateAdmin ? (
        <button
          aria-label={`Create ${adminRoleLabel ?? title}`}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white ${minimalControl}`}
          type="button"
          onClick={onCreateAdmin}
          title={`Create ${adminRoleLabel ?? title}`}
        >
          <PlusCircle aria-hidden="true" size={17} />
        </button>
      ) : onToggle ? (
        <button
          aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
           className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--ink)] transition hover:bg-[var(--primary)] hover:text-white ${minimalControl}`}
          type="button"
          onClick={onToggle}
        >
          {open ? <ChevronDown aria-hidden="true" size={16} /> : <ChevronRight aria-hidden="true" size={16} />}
        </button>
      ) : null}
    </div>
  );
}

function PersonNode({
  accentClassName,
  href,
  onSelect,
  roleLabel,
  status = "Active",
  subtitle,
  title,
  variant,
}: {
  accentClassName: string;
  href: string;
  onSelect?: () => void;
  roleLabel: "Owner Admin" | "Organization Admin" | "Site Admin" | "Member";
  status?: "Active" | "Inactive";
  subtitle: string;
  title: string;
  variant?: "owner";
}) {
  const roleClass = roleBadgeClass(roleLabel);
  const content = (
    <>
      <span className={`absolute inset-y-3 left-0 w-1.5 rounded-r-full ${accentClassName}`} aria-hidden="true" />
       <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] text-[11px] font-black text-[var(--ink)]">
        {initialsFrom(title)}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-black text-[var(--ink)]">{title}</strong>
        <span className="mt-0.5 block truncate text-[11px] font-semibold text-[var(--muted)]">{subtitle}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${roleClass}`}>{roleLabel}</span>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${status === "Active" ? "text-emerald-600" : "text-slate-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden="true" />
            {status}
          </span>
        </span>
      </span>
      <span className="rounded-full px-2 text-lg font-black leading-none text-[var(--muted)] transition group-hover:text-[var(--primary)]">...</span>
    </>
  );

  const className = `org-chart-node org-chart-person group relative flex min-h-[64px] w-full max-w-[272px] items-center gap-3 rounded-xl px-3 py-2 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] ${minimalNode} ${variant === "owner" ? "max-w-[300px]" : ""}`;

  if (onSelect) {
    return (
      <button className={className} type="button" onClick={onSelect}>
        {content}
      </button>
    );
  }

  return (
    <Link className={className} href={href}>
      {content}
    </Link>
  );
}

function OrganizationUserDrawer({
  action,
  categories,
  onClose,
  open,
  organizationName,
  organizations,
  plants,
  roleOptions,
  user,
  userPermissions,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  categories: ScopeOption[];
  onClose: () => void;
  open: boolean;
  organizationName: string;
  organizations: OrganizationOption[];
  plants: ScopeOption[];
  roleOptions: RoleOption[];
  user: ChartUser | null;
  userPermissions?: UserPermissions;
}) {
  if (!user || !action || !userPermissions?.canUpdate) return null;

  const formId = `organization-user-drawer-${user.id}`;
  const selectedCategoryIds = getUserCategoryIds(user);
  const editableCategories = user.plantId
    ? categories.filter((category) => !category.plantId || category.plantId === user.plantId)
    : [];
  const profileVersion = getAssetVersion(user.profilePhoto?.updatedAt);

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button
        aria-label="Close user settings"
        className={`absolute inset-0 bg-slate-950/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        type="button"
        onClick={onClose}
      />
      <aside
        aria-label="User settings"
        className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-[-20px_0_48px_rgba(15,23,42,0.18)] transition-transform duration-300 sm:p-6 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar fullName={user.fullName} hasPhoto={Boolean(user.profilePhoto)} size="md" userId={user.id} version={profileVersion} />
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--primary)]">
                <CircleUserRound aria-hidden="true" size={15} />
                User Settings
              </p>
              <h3 className="mt-1 truncate text-2xl font-black text-[var(--ink)]">{user.fullName}</h3>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{user.username} - {formatRoleNameForChart(user.role)}</p>
            </div>
          </div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] text-[var(--ink)] transition hover:bg-[var(--primary)] hover:text-white" type="button" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form id={formId} action={action} className="mt-6 grid gap-5">
          <AdminUserRoleScopeController formId={formId} organizationName={organizationName} />
          <input name="userId" type="hidden" value={user.id} />

          {organizations.length > 0 ? (
            <label className="grid gap-1 text-sm font-semibold">
              Organization
              <select name="organizationId" defaultValue={user.organizationId ?? ""} data-filters-scope-options="true" className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]">
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Username
              <input name="username" required defaultValue={user.username} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Full name
              <input name="fullName" required defaultValue={user.fullName} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold">
            Department
            <input name="department" defaultValue={user.department ?? ""} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Role
              {userPermissions.canAssignRole ? (
                <select name="role" required defaultValue={user.role} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]">
                  {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
              ) : (
                <>
                  <input name="role" type="hidden" value={user.role} />
                  <span className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-[var(--muted)]">{formatRoleNameForChart(user.role)}</span>
                </>
              )}
            </label>
            <label className="grid gap-1 text-sm font-semibold" data-site-scope-control>
              Site
              {userPermissions.canAssignPlant ? (
                <select name="plantId" defaultValue={user.plantId ?? ""} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]">
                  <option value="">No Site</option>
                  {plants.map((plant) => (
                    <option key={plant.id} value={plant.id} data-organization-id={plant.organizationId ?? ""}>{plant.name}</option>
                  ))}
                </select>
              ) : (
                <span className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-[var(--muted)]">{plants.find((plant) => plant.id === user.plantId)?.name ?? "-"}</span>
              )}
            </label>
          </div>

          <div className="grid gap-2 text-sm font-semibold" data-category-scope-control>
            Category
            {userPermissions.canAssignCategories ? (
              <DrawerCategoryCheckboxes categories={editableCategories} selectedIds={selectedCategoryIds} />
            ) : (
              <span className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-[var(--muted)]">{formatOrgUserCategories(user) || "-"}</span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              <span className="inline-flex items-center gap-2"><KeyRound aria-hidden="true" size={16} /> Reset password</span>
              {userPermissions.canResetPassword ? (
                <input name="password" placeholder="Enter new password to reset" type="password" className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
              ) : (
                <span className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 py-3 text-[var(--muted)]">No permission</span>
              )}
            </label>
            {userPermissions.canDeactivate ? (
              <label className="mt-6 flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-sm font-semibold">
                <input name="active" type="checkbox" defaultChecked={user.active !== false} className="h-4 w-4 accent-[var(--primary)]" />
                Active
              </label>
            ) : (
              <span className="mt-6 flex min-h-12 items-center rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-sm font-semibold text-[var(--muted)]">
                {user.active !== false ? "Active" : "Inactive"}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-2"><Upload aria-hidden="true" size={16} /> Upload signature PNG/JPG</span>
              <input name="signature" type="file" accept="image/png,image/jpeg" className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3 text-[var(--ink)]" />
            </label>
            <div className="grid gap-2 text-sm font-semibold">
              Upload profile photo PNG/JPG/WebP
              <ProfilePhotoPreview />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:-mx-6 sm:px-6">
            <Link className="text-sm font-bold text-[var(--primary)] hover:underline" href={`/admin/users#user-${user.id}`}>Open full Admin Users</Link>
            <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-6 font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition hover:bg-[var(--primary-strong)]" type="submit">
              Save user
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function OrganizationCreateUserDrawer({
  action,
  categories,
  context,
  onClose,
  open,
  organizationName,
  userPermissions,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  categories: ScopeOption[];
  context: CreateUserContext | null;
  onClose: () => void;
  open: boolean;
  organizationName: string;
  userPermissions?: UserPermissions;
}) {
  if (!context || !action || !userPermissions?.canCreate) return null;

  const formId = `organization-create-user-drawer-${context.organizationId}-${context.plantId ?? "org"}`;
  const categoryOptions = context.plantId
    ? categories.filter((category) => !category.plantId || category.plantId === context.plantId)
    : [];
  const isOrganizationAdmin = context.role === RoleName.ORGANIZATION_ADMIN;

  return (
    <div className={`fixed inset-0 z-50 transition ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button
        aria-label="Close create user"
        className={`absolute inset-0 bg-slate-950/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        type="button"
        onClick={onClose}
      />
      <aside
        aria-label={context.title}
        className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-[-20px_0_48px_rgba(15,23,42,0.18)] transition-transform duration-300 sm:p-6 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--primary)]">
              <PlusCircle aria-hidden="true" size={15} />
              Organization Site Map
            </p>
            <h3 className="mt-1 truncate text-2xl font-black text-[var(--ink)]">{context.title}</h3>
            <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
              {context.organizationName || organizationName}
              {context.plantName ? ` - ${context.plantName}` : ""}
            </p>
          </div>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] text-[var(--ink)] transition hover:bg-[var(--primary)] hover:text-white" type="button" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form id={formId} action={action} className="mt-6 grid gap-5">
          <AdminUserRoleScopeController formId={formId} organizationName={context.organizationName || organizationName} />
          <input name="organizationId" type="hidden" value={context.organizationId} />
          <input name="plantId" type="hidden" value={context.plantId ?? ""} />
          <input name="role" type="hidden" value={context.role} />

          <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Role</span>
              <p className="mt-1 font-black text-[var(--ink)]">{formatRoleNameForChart(context.role)}</p>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Scope</span>
              <p className="mt-1 font-black text-[var(--ink)]">{context.plantName ?? context.organizationName}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold">
              Username
              <input name="username" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Full name
              <input name="fullName" required className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold">
            Department
            <input name="department" defaultValue={context.department} className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
          </label>

          <label className="grid gap-1 text-sm font-semibold">
            Password
            <input name="password" required type="password" className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4 text-[var(--ink)]" />
          </label>

          {!isOrganizationAdmin && userPermissions.canAssignCategories ? (
            <div className="grid gap-2 text-sm font-semibold" data-category-scope-control>
              Category
              <DrawerCategoryCheckboxes categories={categoryOptions} selectedIds={[]} />
            </div>
          ) : null}

          <div className="sticky bottom-0 -mx-5 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:-mx-6 sm:px-6">
            <Link className="text-sm font-bold text-[var(--primary)] hover:underline" href="/admin/users">Open full Admin Users</Link>
            <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-6 font-black text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition hover:bg-[var(--primary-strong)]" type="submit">
              Create user
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function DrawerCategoryCheckboxes({
  categories,
  selectedIds,
}: {
  categories: ScopeOption[];
  selectedIds: string[];
}) {
  const selected = new Set(selectedIds);
  return (
    <div className="grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3">
      {categories.length === 0 ? (
        <span className="text-sm font-semibold text-[var(--muted)]">No Category</span>
      ) : (
        categories.map((category) => (
          <label key={category.id} data-category-organization-id={category.organizationId ?? ""} className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold">
            <input className="h-4 w-4 shrink-0 accent-[var(--primary)]" defaultChecked={selected.has(category.id)} name="categoryIds" type="checkbox" value={category.id} />
            <span className="truncate">{category.name}</span>
          </label>
        ))
      )}
    </div>
  );
}

function EmptyNode({ text }: { text: string }) {
  return (
      <div className={`org-chart-node grid min-h-[58px] w-full max-w-[272px] place-items-center rounded-xl border-dashed px-4 py-3 text-center text-xs font-bold text-[var(--muted)] ${minimalNode}`}>
      {text}
    </div>
  );
}

function Connector() {
  return (
    <div className="mx-auto my-2 flex h-7 w-4 justify-center" aria-hidden="true">
      <span className={`h-full w-[3px] rounded-full ${chartLine}`} />
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.18em] text-[var(--primary)]">
      {children}
    </p>
  );
}

function roleBadgeClass(role: string) {
  if (role === "Owner Admin") return "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200";
  if (role === "Organization Admin") return "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200";
  if (role === "Site Admin") return "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200";
  return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200";
}

function structureNodeClass(type: "organization" | "site" | "public") {
  if (type === "organization") return "org-chart-organization";
  if (type === "site") return "org-chart-site";
  return "org-chart-public";
}

function formatRoleNameForChart(role: string) {
  if (role === RoleName.ADMIN) return "Owner Admin";
  if (role === RoleName.ORGANIZATION_ADMIN) return "Organization Admin";
  if (isSiteAdminRole(role)) return "Site Admin";
  if (role === RoleName.ENGINEER) return "Engineer";
  if (role === RoleName.TECHNICIAN) return "Technician";
  if (role === RoleName.VISITOR) return "Visitor";
  return role;
}

function formatOrgUserCategories(user: {
  category?: { name: string } | null;
  categories?: { category: { name: string } }[];
}) {
  const names = [
    ...(user.category?.name ? [user.category.name] : []),
    ...(user.categories ?? []).map((item) => item.category.name),
  ];
  return [...new Set(names)].join(", ");
}

function getUserCategoryIds(user: {
  categoryId?: string | null;
  categories?: { categoryId: string }[];
}) {
  const ids = [
    ...(user.categoryId ? [user.categoryId] : []),
    ...(user.categories ?? []).map((item) => item.categoryId),
  ];
  return [...new Set(ids)];
}

function getAssetVersion(value?: Date | string) {
  if (!value) return undefined;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function initialsFrom(value: string) {
  const letters = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "PC";
}

function textMatches(needle: string, ...values: string[]) {
  if (!needle) return true;
  return values.some((value) => value.toLowerCase().includes(needle));
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("a,button,input,select,textarea,label,summary,[role='button']"));
}

function userMatches(user: ChartUser, needle: string, activeOnly: boolean) {
  if (activeOnly && user.active === false) return false;
  if (!needle) return true;
  return textMatches(
    needle,
    user.fullName,
    user.role,
    user.category?.name ?? "",
    ...(user.categories ?? []).map((item) => item.category.name),
  );
}

function clampZoom(value: number) {
  return Math.min(1.6, Math.max(0.55, Number(value.toFixed(2))));
}
