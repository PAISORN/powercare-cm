import { RoleName, WorkStatus, type Actor, type WorkAccessContext } from "../cm-work/cm-work-types";

function sameCategory(actor: Actor, work: WorkAccessContext) {
  return actor.categoryId === work.categoryId;
}

function isClaimableStatus(status: string) {
  return status === WorkStatus.NEW || status === WorkStatus.WAITING_TO_CLAIM || status === WorkStatus.RETURNED_FOR_CORRECTION;
}

export function canClaimWork(actor: Actor, work: WorkAccessContext) {
  if (work.claimantId) return false;
  if (!isClaimableStatus(work.status)) return false;
  if (actor.role === RoleName.ADMIN) return true;
  if (actor.role === RoleName.ENGINEER || actor.role === RoleName.TECHNICIAN) return sameCategory(actor, work);
  return false;
}

export function canCancelWork(actor: Actor, work: WorkAccessContext) {
  if (work.status === WorkStatus.CLOSED || work.status === WorkStatus.CANCELED) return false;
  if (actor.role === RoleName.ADMIN) return true;
  return actor.role === RoleName.ENGINEER && sameCategory(actor, work);
}

export function canCloseWork(actor: Actor, work: WorkAccessContext) {
  if (work.status !== WorkStatus.WAITING_TO_CLOSE) return false;
  if (actor.role === RoleName.ADMIN) return true;
  return actor.role === RoleName.ENGINEER && sameCategory(actor, work);
}

export function canPrintCompletionDocument(actor: Actor, work: WorkAccessContext) {
  return Boolean(actor.id) && work.status === WorkStatus.CLOSED;
}
