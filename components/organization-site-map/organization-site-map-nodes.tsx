import Link from "next/link";
import { type ReactNode } from "react";
import { Building2, ChevronDown, ChevronRight, Factory, PlusCircle, Users } from "lucide-react";
import { isSiteAdminRole, RoleName } from "../../modules/cm-work/cm-work-types";
import {
  chartLine,
  formatOrgUserCategories,
  formatRoleNameForChart,
  hierarchyAccent,
  initialsFrom,
  minimalControl,
  minimalNode,
  minimalPanel,
  roleBadgeClass,
  structureNodeClass,
  type ChartSite,
  type ChartUser,
  type CreateUserContext,
} from "./organization-site-map-model";
export function SiteBranch({
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

export function ToolbarButton({
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

export function StructureNode({
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

export function PersonNode({
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

export function EmptyNode({ text }: { text: string }) {
  return (
      <div className={`org-chart-node grid min-h-[58px] w-full max-w-[272px] place-items-center rounded-xl border-dashed px-4 py-3 text-center text-xs font-bold text-[var(--muted)] ${minimalNode}`}>
      {text}
    </div>
  );
}

export function Connector() {
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
