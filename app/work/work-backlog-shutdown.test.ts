import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canTransition } from "../../modules/cm-work/cm-work-state-machine";
import { WorkStatus } from "../../modules/cm-work/cm-work-types";

describe("CM backlog shutdown status", () => {
  it("allows in-progress work to move to shutdown backlog and close from there", () => {
    expect(WorkStatus.BACKLOG_SHUTDOWN).toBe("BACKLOG_SHUTDOWN");
    expect(canTransition(WorkStatus.IN_PROGRESS, WorkStatus.BACKLOG_SHUTDOWN)).toBe(true);
    expect(canTransition(WorkStatus.BACKLOG_SHUTDOWN, WorkStatus.CLOSED)).toBe(true);
  });

  it("exposes the backlog shutdown action on the work detail page", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");

    expect(source).toContain("moveToBacklogShutdownAction");
    expect(source).toContain("moveToBacklogShutdown");
    expect(source).toContain("BACKLOG_SHUTDOWN");
  });
});
