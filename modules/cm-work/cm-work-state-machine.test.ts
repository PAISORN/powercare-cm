import { describe, expect, it } from "vitest";
import { WorkStatus } from "./cm-work-types";
import { canTransition } from "./cm-work-state-machine";

describe("canTransition", () => {
  it("allows the main CM workflow", () => {
    expect(canTransition(WorkStatus.NEW, WorkStatus.CLAIMED)).toBe(true);
    expect(canTransition(WorkStatus.CLAIMED, WorkStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(WorkStatus.IN_PROGRESS, WorkStatus.WAITING_TO_CLOSE)).toBe(true);
    expect(canTransition(WorkStatus.WAITING_TO_CLOSE, WorkStatus.CLOSED)).toBe(true);
  });

  it("allows release back and return for correction", () => {
    expect(canTransition(WorkStatus.CLAIMED, WorkStatus.WAITING_TO_CLAIM)).toBe(true);
    expect(canTransition(WorkStatus.IN_PROGRESS, WorkStatus.WAITING_TO_CLAIM)).toBe(true);
    expect(canTransition(WorkStatus.WAITING_TO_CLOSE, WorkStatus.RETURNED_FOR_CORRECTION)).toBe(true);
    expect(canTransition(WorkStatus.RETURNED_FOR_CORRECTION, WorkStatus.WAITING_TO_CLOSE)).toBe(true);
  });

  it("allows an unassigned returned work to be claimed again", () => {
    expect(canTransition(WorkStatus.RETURNED_FOR_CORRECTION, WorkStatus.CLAIMED)).toBe(true);
  });

  it("blocks closed and canceled work from returning to active workflow", () => {
    expect(canTransition(WorkStatus.CLOSED, WorkStatus.IN_PROGRESS)).toBe(false);
    expect(canTransition(WorkStatus.CANCELED, WorkStatus.CLAIMED)).toBe(false);
  });
});
