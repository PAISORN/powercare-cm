import { WorkStatus, type WorkStatus as WorkStatusValue } from "./cm-work-types";

const allowedTransitions: Record<WorkStatusValue, WorkStatusValue[]> = {
  NEW: [WorkStatus.CLAIMED, WorkStatus.CANCELED],
  WAITING_TO_CLAIM: [WorkStatus.CLAIMED, WorkStatus.CANCELED],
  CLAIMED: [WorkStatus.IN_PROGRESS, WorkStatus.WAITING_TO_CLAIM, WorkStatus.CANCELED],
  IN_PROGRESS: [WorkStatus.WAITING_TO_CLOSE, WorkStatus.WAITING_TO_CLAIM, WorkStatus.CANCELED],
  WAITING_TO_CLOSE: [WorkStatus.CLOSED, WorkStatus.RETURNED_FOR_CORRECTION, WorkStatus.CANCELED],
  RETURNED_FOR_CORRECTION: [WorkStatus.CLAIMED, WorkStatus.WAITING_TO_CLOSE, WorkStatus.CANCELED],
  CLOSED: [],
  CANCELED: [],
};

export function canTransition(from: string, to: WorkStatusValue) {
  return (allowedTransitions[from as WorkStatusValue] ?? []).includes(to);
}
