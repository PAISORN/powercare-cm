import { describe, expect, it } from "vitest";
import {
  formatSparePartCode,
  formatSparePartIssueNumber,
  formatSparePartIssueLineNumber,
  formatSparePartReceiveNumber,
  formatStoreIssueSequenceKey,
  normalizeStoreSiteCode,
} from "./store-numbering";

describe("store numbering", () => {
  it("formats spare part code per site", () => {
    expect(formatSparePartCode("rtb", 1)).toBe("SP-RTB-00001");
    expect(formatSparePartCode("RTB", 42)).toBe("SP-RTB-00042");
  });

  it("formats issue number with Bangkok year and month", () => {
    const date = new Date("2026-07-08T02:30:00.000Z");
    expect(formatSparePartIssueNumber("rtb", date, 1)).toBe("SI-RTB-2026-07-0001");
    expect(formatStoreIssueSequenceKey("rtb", date)).toBe("RTB-2026-07");
  });

  it("uses Bangkok month when UTC is still the previous day", () => {
    const date = new Date("2026-06-30T18:30:00.000Z");
    expect(formatSparePartIssueNumber("rtb", date, 12)).toBe("SI-RTB-2026-07-0012");
  });

  it("formats receive numbers with the Site code and Bangkok date", () => {
    expect(formatSparePartReceiveNumber("rtb", new Date("2026-07-08T18:30:00.000Z"), "a1b2c3")).toBe(
      "RCV-RTB-20260709-A1B2C3",
    );
  });

  it("formats item-specific issue line numbers and strips GL from the type code", () => {
    expect(
      formatSparePartIssueLineNumber({
        siteCode: "rtb",
        storeCode: "SP01",
        typeCode: "GL630101",
        categoryCode: "EI",
        storageZoneCode: "02",
        itemCode: "FUSE-001",
        nextNumber: 1,
      }),
    ).toBe("RTB-SP01-630101-EI-02-FUSE001-00001");
  });

  it("normalizes site code safely", () => {
    expect(normalizeStoreSiteCode(" r-t_b ")).toBe("RTB");
    expect(() => normalizeStoreSiteCode("   ")).toThrow("Site code is required");
    expect(() => normalizeStoreSiteCode("RUNGTIVA")).toThrow("exactly 3");
    expect(() => normalizeStoreSiteCode("RT")).toThrow("exactly 3");
  });
});
