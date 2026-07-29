import { WorkStatus } from "./cm-work-types";

export const progressUpdateReminderIntervalMs = 7 * 24 * 60 * 60 * 1000;

export function needsProgressUpdateReminder(
  work: {
    status: string;
    claimedAt: Date | null;
    inProgressAt: Date | null;
    createdAt: Date;
  },
  latestActivityAt?: Date | null,
  now = new Date(),
) {
  if (work.status !== WorkStatus.CLAIMED && work.status !== WorkStatus.IN_PROGRESS) return false;
  const statusAnchor = work.inProgressAt ?? work.claimedAt ?? work.createdAt;
  const anchor =
    latestActivityAt && latestActivityAt.getTime() > statusAnchor.getTime()
      ? latestActivityAt
      : statusAnchor;
  return now.getTime() - anchor.getTime() >= progressUpdateReminderIntervalMs;
}
