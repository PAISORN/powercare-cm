import { describe, expect, it } from "vitest";
import { WorkStatus } from "../cm-work/cm-work-types";
import { calculateMemberMetrics } from "./member-query";

describe("calculateMemberMetrics", () => {
  const window = {
    start: new Date("2026-05-31T17:00:00.000Z"),
    endExclusive: new Date("2026-06-30T17:00:00.000Z"),
  };

  it("counts current assigned work and work closed inside the selected range", () => {
    const result = calculateMemberMetrics(
      [
        { status: WorkStatus.IN_PROGRESS, closedAt: null },
        { status: WorkStatus.WAITING_TO_CLOSE, closedAt: null },
        { status: WorkStatus.CLOSED, closedAt: new Date("2026-06-10T04:00:00.000Z") },
        { status: WorkStatus.CLOSED, closedAt: new Date("2026-05-10T04:00:00.000Z") },
        { status: WorkStatus.CANCELED, closedAt: null },
      ],
      window,
    );

    expect(result).toEqual({ active: 2, closed: 1 });
  });

  it("counts all closed work when no date window is selected", () => {
    const result = calculateMemberMetrics(
      [
        { status: WorkStatus.CLOSED, closedAt: new Date("2026-06-10T04:00:00.000Z") },
        { status: WorkStatus.CLOSED, closedAt: new Date("2025-06-10T04:00:00.000Z") },
      ],
      undefined,
    );

    expect(result).toEqual({ active: 0, closed: 2 });
  });
});
