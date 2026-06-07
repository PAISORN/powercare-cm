import { describe, expect, it } from "vitest";
import { formatCmWorkNumber } from "./cm-work-number";

describe("formatCmWorkNumber", () => {
  it("formats year, month, and monthly sequence", () => {
    expect(formatCmWorkNumber(new Date("2026-06-07T01:00:00Z"), 1)).toBe("CM-2026-06-0001");
    expect(formatCmWorkNumber(new Date("2026-12-01T01:00:00Z"), 42)).toBe("CM-2026-12-0042");
  });
});
