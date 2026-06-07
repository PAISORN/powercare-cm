import { describe, expect, it } from "vitest";
import { WorkStatus } from "../cm-work/cm-work-types";
import { isOverdue } from "./sla-service";

const sla = { claimDays: 1, executionDays: 3, reviewDays: 2 };

describe("isOverdue", () => {
  it("uses claim threshold for new and waiting to claim", () => {
    expect(isOverdue(WorkStatus.NEW, new Date("2026-06-01"), new Date("2026-06-03"), sla)).toBe(true);
  });

  it("uses execution threshold for claimed and in progress", () => {
    expect(isOverdue(WorkStatus.IN_PROGRESS, new Date("2026-06-01"), new Date("2026-06-04"), sla)).toBe(false);
    expect(isOverdue(WorkStatus.IN_PROGRESS, new Date("2026-06-01"), new Date("2026-06-05"), sla)).toBe(true);
  });

  it("uses review threshold for waiting to close", () => {
    expect(isOverdue(WorkStatus.WAITING_TO_CLOSE, new Date("2026-06-01"), new Date("2026-06-04"), sla)).toBe(true);
  });
});
