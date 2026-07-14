import { StoreIssueType, type StoreScope } from "./store-types";

export type CmReference = {
  id: string;
  number: string;
  organizationId: string | null;
  plantId: string | null;
};

export function assertCmReferenceInStoreScope(cmWork: CmReference, scope: StoreScope) {
  if (cmWork.organizationId !== scope.organizationId || cmWork.plantId !== scope.plantId) {
    throw new Error("CM work is outside the selected site scope.");
  }
}

export function resolveStoreIssueType(cmWorkId?: string | null) {
  return cmWorkId ? StoreIssueType.CM_REFERENCED : StoreIssueType.DIRECT;
}

export function canPublicRequesterUseContactField(enabled: boolean) {
  return enabled;
}

export function requirePositiveIssueQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Issue quantity must be greater than zero.");
  }
}

export function canIssueRequestedQuantity(availableStock: number, requestedQuantity: number) {
  requirePositiveIssueQuantity(requestedQuantity);
  return availableStock >= requestedQuantity;
}
