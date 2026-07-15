import { isSiteAdminRole, RoleName } from "../cm-work/cm-work-types";
import { StoreIssueStatus } from "./store-types";

type PrintActor = {
  role: string;
  organizationId?: string | null;
  plantId?: string | null;
};

type PrintableIssue = {
  status: string;
  organizationId: string;
  plantId: string;
};

export function canPrintSparePartIssueDocument(actor: PrintActor, issue: PrintableIssue) {
  if (issue.status !== StoreIssueStatus.ISSUED) return false;
  if (actor.role === RoleName.ADMIN) return true;

  if (actor.role === RoleName.ORGANIZATION_ADMIN) {
    return Boolean(actor.organizationId) && actor.organizationId === issue.organizationId;
  }

  if (isSiteAdminRole(actor.role) || actor.role === RoleName.STORE_OFFICER) {
    return Boolean(actor.plantId) && actor.plantId === issue.plantId;
  }

  return false;
}
