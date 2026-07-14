import { LEGACY_SITE_ADMIN_ROLE, RoleName } from "../cm-work/cm-work-types";

const roleLabels: Record<string, string> = {
  [RoleName.ADMIN]: "Owner Admin",
  [RoleName.ORGANIZATION_ADMIN]: "Organization Admin",
  [RoleName.SITE_ADMIN]: "Site Admin",
  [LEGACY_SITE_ADMIN_ROLE]: "Site Admin",
  [RoleName.ENGINEER]: "Engineer",
  [RoleName.TECHNICIAN]: "Technician",
  [RoleName.STORE_OFFICER]: "Store Officer",
  [RoleName.VISITOR]: "Visitor",
};

export function formatRoleName(role: string) {
  return roleLabels[role] ?? role;
}
