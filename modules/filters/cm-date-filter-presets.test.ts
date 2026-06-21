import { describe, expect, it } from "vitest";
import { getCmDatePreset } from "./cm-date-filter-presets";

describe("getCmDatePreset", () => {
  const bangkokJune19 = new Date("2026-06-18T17:30:00.000Z");

  it("includes the current Bangkok date in rolling day presets", () => {
    expect(getCmDatePreset("last7", bangkokJune19)).toEqual({
      mode: "range",
      startDate: "2026-06-13",
      endDate: "2026-06-19",
    });
    expect(getCmDatePreset("last30", bangkokJune19)).toEqual({
      mode: "range",
      startDate: "2026-05-21",
      endDate: "2026-06-19",
    });
  });

  it("calculates month, quarter, and year to date in Bangkok time", () => {
    expect(getCmDatePreset("monthToDate", bangkokJune19)).toEqual({
      mode: "range",
      startDate: "2026-06-01",
      endDate: "2026-06-19",
    });
    expect(getCmDatePreset("quarterToDate", bangkokJune19)).toEqual({
      mode: "range",
      startDate: "2026-04-01",
      endDate: "2026-06-19",
    });
    expect(getCmDatePreset("yearToDate", bangkokJune19)).toEqual({
      mode: "range",
      startDate: "2026-01-01",
      endDate: "2026-06-19",
    });
  });

  it("uses rolling calendar months for long presets", () => {
    expect(getCmDatePreset("last3Months", bangkokJune19)).toEqual({
      mode: "range",
      startDate: "2026-03-20",
      endDate: "2026-06-19",
    });
    expect(getCmDatePreset("last12Months", bangkokJune19)).toEqual({
      mode: "range",
      startDate: "2025-06-20",
      endDate: "2026-06-19",
    });
  });

  it("returns all mode without artificial dates", () => {
    expect(getCmDatePreset("all", bangkokJune19)).toEqual({ mode: "all" });
  });
});
