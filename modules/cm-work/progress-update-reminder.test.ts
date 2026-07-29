import { describe, expect, it } from "vitest";
import { WorkStatus } from "./cm-work-types";
import { needsProgressUpdateReminder } from "./progress-update-reminder";

const now = new Date("2026-07-29T12:00:00.000Z");
const baseWork = {
  status: WorkStatus.IN_PROGRESS,
  claimedAt: new Date("2026-07-01T12:00:00.000Z"),
  inProgressAt: new Date("2026-07-10T12:00:00.000Z"),
  createdAt: new Date("2026-07-01T12:00:00.000Z"),
};

describe("progress update reminder", () => {
  it("appears when the latest work activity reaches seven days", () => {
    expect(needsProgressUpdateReminder(baseWork, new Date("2026-07-22T12:00:00.000Z"), now)).toBe(true);
  });

  it("stays hidden until seven days after a new progress update", () => {
    expect(needsProgressUpdateReminder(baseWork, new Date("2026-07-23T12:00:00.000Z"), now)).toBe(false);
  });

  it("uses a newer status transition as the next reminder anchor", () => {
    expect(needsProgressUpdateReminder(baseWork, new Date("2026-07-28T12:00:00.000Z"), now)).toBe(false);
  });

  it("does not appear for completed workflow statuses", () => {
    expect(needsProgressUpdateReminder({ ...baseWork, status: WorkStatus.CLOSED }, new Date("2026-07-01T12:00:00.000Z"), now)).toBe(false);
  });
});
