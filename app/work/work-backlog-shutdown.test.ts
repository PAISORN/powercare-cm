import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canEnterBacklogShutdown, canTransition } from "../../modules/cm-work/cm-work-state-machine";
import { WorkStatus } from "../../modules/cm-work/cm-work-types";

describe("CM backlog shutdown status", () => {
  it("requires shutdown backlog work to resume before it can be submitted for closing", () => {
    expect(WorkStatus.BACKLOG_SHUTDOWN).toBe("BACKLOG_SHUTDOWN");
    expect(canTransition(WorkStatus.CLAIMED, WorkStatus.BACKLOG_SHUTDOWN)).toBe(true);
    expect(canTransition(WorkStatus.IN_PROGRESS, WorkStatus.BACKLOG_SHUTDOWN)).toBe(true);
    expect(canTransition(WorkStatus.BACKLOG_SHUTDOWN, WorkStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(WorkStatus.BACKLOG_SHUTDOWN, WorkStatus.CLOSED)).toBe(false);
    expect(canEnterBacklogShutdown(WorkStatus.CLAIMED, "TECHNICIAN")).toBe(true);
    expect(canEnterBacklogShutdown(WorkStatus.CLAIMED, "ENGINEER")).toBe(false);
  });

  it("exposes the backlog shutdown action on the work detail page", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("moveToBacklogShutdownAction");
    expect(source).toContain("moveToBacklogShutdown");
    expect(source).toContain("BACKLOG_SHUTDOWN");
    expect(source).toContain("canEnterBacklogShutdown(work.status, work.claimant?.role)");
    expect(source).toContain("work.status === WorkStatus.BACKLOG_SHUTDOWN");
  });
});
