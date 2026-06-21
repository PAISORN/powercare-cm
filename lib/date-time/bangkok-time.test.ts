import { describe, expect, it } from "vitest";
import { bangkokDayWindow, formatThaiDateTime } from "./bangkok-time";

describe("Bangkok time", () => {
  it("converts a Bangkok calendar day to an exclusive UTC window", () => {
    expect(bangkokDayWindow("2026-01-15")).toEqual({
      start: new Date("2026-01-14T17:00:00.000Z"),
      endExclusive: new Date("2026-01-15T17:00:00.000Z"),
    });
  });

  it("formats Buddhist year and 24-hour time with a readable Thai suffix", () => {
    expect(formatThaiDateTime(new Date("2026-06-18T07:30:00.000Z"))).toBe("18/06/2569 14:30 น.");
  });
});
