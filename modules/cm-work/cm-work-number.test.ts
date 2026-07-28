import { describe, expect, it } from "vitest";
import { formatCmWorkNumber } from "./cm-work-number";

describe("formatCmWorkNumber", () => {
  it("formats year, month, and monthly sequence", () => {
    expect(formatCmWorkNumber("RTB", new Date("2026-06-07T01:00:00Z"), 1)).toBe("CM-RTB-2026-06-0001");
    expect(formatCmWorkNumber("rayong", new Date("2026-12-01T01:00:00Z"), 42)).toBe("CM-RAYONG-2026-12-0042");
  });
});
