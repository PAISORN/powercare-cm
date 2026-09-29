"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Factory, Maximize2, Minimize2, Move, RefreshCw, Search, SlidersHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { isSiteAdminRole, RoleName } from "../../modules/cm-work/cm-work-types";
import {
  chartLine,
  clampZoom,
  filterOrganizationTree,
  getOrganizationBranchIds,
  hierarchyAccent,
  isInteractiveTarget,
  minimalControl,
  minimalPanel,
  minimalShell,
  type ChartUser,
  type CreateUserContext,
  type OrganizationSiteMapProps,
  type ViewMode,
} from "./organization-site-map-model";
import { Connector, EmptyNode, PersonNode, SiteBranch, StructureNode, ToolbarButton } from "./organization-site-map-nodes";
import { OrganizationCreateUserDrawer, OrganizationUserDrawer } from "./organization-site-map-drawers";

export function OrganizationSiteMap({
  categories = [],
  organizationName = "",
  organizationTree,
  organizations = [],
  plants = [],
  roleOptions = [],
  createUserAction,
  updateUserAction,
  userPermissions,
  viewerRole = RoleName.ADMIN,
}: OrganizationSiteMapProps) {
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

  const allBranchIds = useMemo(() => getOrganizationBranchIds(organizationTree), [organizationTree]);
  const filteredTree = useMemo(
    () => filterOrganizationTree(organizationTree, query, activeOnly),
    [activeOnly, organizationTree, query],
  );

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
