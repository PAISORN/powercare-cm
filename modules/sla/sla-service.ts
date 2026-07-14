import { WorkStatus } from "../cm-work/cm-work-types";

type Sla = {
  claimDays: number;
  executionDays: number;
  reviewDays: number;
};

const dayMs = 24 * 60 * 60 * 1000;

export function isOverdue(status: string, enteredAt: Date, now: Date, sla: Sla) {
  const ageDays = Math.floor((now.getTime() - enteredAt.getTime()) / dayMs);

  if (status === WorkStatus.NEW || status === WorkStatus.WAITING_TO_CLAIM) return ageDays > sla.claimDays;
  if (status === WorkStatus.CLAIMED || status === WorkStatus.IN_PROGRESS) return ageDays > sla.executionDays;
  if (status === WorkStatus.BACKLOG_SHUTDOWN) return false;
  if (status === WorkStatus.WAITING_TO_CLOSE) return ageDays > sla.reviewDays;

  return false;
}
