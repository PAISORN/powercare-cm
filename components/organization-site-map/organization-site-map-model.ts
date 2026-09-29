import { isSiteAdminRole, RoleName } from "../../modules/cm-work/cm-work-types";
import {
  formatUserCategories,
  getUserCategoryIds as getManagedUserCategoryIds,
} from "../../modules/users/admin-user-page-model";

export type ChartUser = {
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
  inventoryScopes?: {
    itemKind: string;
    responsibilityEnabled: boolean;
    approvalEnabled: boolean;
  }[];
};

export type ChartSite = {
  id: string;
  code: string;
  name: string;
  users: ChartUser[];
  _count: { users: number; works: number; zones: number };
};

export type ChartOrganization = {
  id: string;
  name: string;
  slug: string;
  users: ChartUser[];
  plants: ChartSite[];
};

export type ViewMode = "horizontal" | "vertical";
export type ScopeOption = { id: string; name: string; organizationId?: string | null; plantId?: string | null };
export type OrganizationOption = { id: string; name: string };
export type RoleOption = { value: string; label: string };
export type UserPermissions = {
  canCreate: boolean;
  canUpdate: boolean;
  canResetPassword: boolean;
  canAssignRole: boolean;
  canAssignPlant: boolean;
  canAssignCategories: boolean;
  canAssignInventory: boolean;
  canDeactivate: boolean;
};
export type CreateUserContext = {
  title: "Create Organization Admin" | "Create Site Admin";
  role: string;
  organizationId: string;
  organizationName: string;
  plantId?: string | null;
  plantName?: string | null;
  department: string;
};

export type OrganizationSiteMapProps = {
  categories?: ScopeOption[];
  organizationName?: string;
  organizationTree: ChartOrganization[];
  organizations?: OrganizationOption[];
  plants?: ScopeOption[];
  roleOptions?: RoleOption[];
  createUserAction?: (formData: FormData) => void | Promise<void>;
  updateUserAction?: (formData: FormData) => void | Promise<void>;
  userPermissions?: UserPermissions;
  viewerRole?: string;
};

export const minimalShell =
  "minimal-shell rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(15,23,42,0.06)]";
export const minimalPanel =
  "minimal-panel border border-[var(--line)] bg-[var(--surface)] shadow-[0_4px_16px_rgba(15,23,42,0.04)]";
export const minimalNode =
  "minimal-node border border-[var(--line)] bg-[var(--surface)] shadow-[0_6px_18px_rgba(15,23,42,0.05)]";
export const minimalControl =
  "border border-[var(--line)] bg-[var(--surface)] shadow-[0_2px_8px_rgba(15,23,42,0.04)]";
export const chartLine = "bg-[color-mix(in_srgb,var(--line)_58%,var(--ink)_42%)]";
export const hierarchyAccent = {
  owner: "bg-violet-600",
  organization: "bg-blue-500",
  organizationAdmin: "bg-indigo-500",
  site: "bg-emerald-500",
  siteAdmin: "bg-amber-500",
  member: "bg-slate-400",
  public: "bg-cyan-500",
};

export function getOrganizationBranchIds(organizationTree: readonly ChartOrganization[]) {
  return organizationTree.flatMap((organization) => [
    `org:${organization.id}`,
    ...organization.plants.map((site) => `site:${site.id}`),
  ]);
}

export function filterOrganizationTree(
  organizationTree: readonly ChartOrganization[],
  query: string,
  activeOnly: boolean,
) {
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
}

export function roleBadgeClass(role: string) {
  if (role === "Owner Admin") return "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200";
  if (role === "Organization Admin") return "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200";
  if (role === "Site Admin") return "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200";
  return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200";
}

export function structureNodeClass(type: "organization" | "site" | "public") {
  if (type === "organization") return "org-chart-organization";
  if (type === "site") return "org-chart-site";
  return "org-chart-public";
}

export function formatRoleNameForChart(role: string) {
  if (role === RoleName.ADMIN) return "Owner Admin";
  if (role === RoleName.ORGANIZATION_ADMIN) return "Organization Admin";
  if (isSiteAdminRole(role)) return "Site Admin";
  if (role === RoleName.ENGINEER) return "Engineer";
  if (role === RoleName.TECHNICIAN) return "Technician";
  if (role === RoleName.VISITOR) return "Visitor";
  return role;
}

export function formatOrgUserCategories(user: Pick<ChartUser, "category" | "categories">) {
  return formatUserCategories(user);
}

export function getUserCategoryIds(user: Pick<ChartUser, "categoryId" | "categories">) {
  return getManagedUserCategoryIds({
    categoryId: user.categoryId ?? null,
    categories: user.categories,
  });
}

export function getAssetVersion(value?: Date | string) {
  if (!value) return undefined;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

export function initialsFrom(value: string) {
  const letters = value.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("");
  return letters || "PC";
}

export function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("a,button,input,select,textarea,label,summary,[role='button']"));
}

export function clampZoom(value: number) {
  return Math.min(1.6, Math.max(0.55, Number(value.toFixed(2))));
}

function textMatches(needle: string, ...values: string[]) {
  if (!needle) return true;
  return values.some((value) => value.toLowerCase().includes(needle));
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
