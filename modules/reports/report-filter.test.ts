import { describe, expect, it } from "vitest";
import { parseReportFilter, serializeReportFilter } from "./report-filter";

describe("report filter", () => {
  it("normalizes every supported report field", () => {
    const params = new URLSearchParams({
      mode: "range",
      startDate: "2026-06-01",
      endDate: "2026-06-19",
      status: "IN_PROGRESS",
      categoryId: "cat-electrical",
      zoneId: "zone-boiler",
      urgency: "URGENT",
      claimantId: "user-tech",
      requester: "  Somchai  ",
      department: " Operations ",
      machineName: " Feed Pump ",
      number: " CM-2026 ",
    });

    const filter = parseReportFilter(params);

    expect(filter.status).toBe("IN_PROGRESS");
    expect(filter.requester).toBe("Somchai");
    expect(filter.department).toBe("Operations");
    expect(filter.machineName).toBe("Feed Pump");
    expect(filter.number).toBe("CM-2026");
    expect(filter.dateFilter.start).toEqual(new Date("2026-05-31T17:00:00.000Z"));
    expect(filter.dateFilter.endExclusive).toEqual(new Date("2026-06-19T17:00:00.000Z"));
  });

  it("serializes the normalized filter identically for preview and export", () => {
    const parsed = parseReportFilter(new URLSearchParams("mode=month&month=2026-06&status=CLOSED&categoryId=electrical"));
    const serialized = serializeReportFilter(parsed);

    expect(parseReportFilter(new URLSearchParams(serialized))).toEqual(parsed);
  });

  it("ignores invalid status and urgency values", () => {
    const filter = parseReportFilter(new URLSearchParams("status=UNKNOWN&urgency=FAST"));

    expect(filter.status).toBeUndefined();
    expect(filter.urgency).toBeUndefined();
  });

  it("defaults to the beginning of 2026 through the current Bangkok date", () => {
    const filter = parseReportFilter(new URLSearchParams(), new Date("2026-06-27T18:00:00.000Z"));

    expect(filter.dateInput.mode).toBe("range");
    expect(filter.dateInput.startDate).toBe("2026-01-01");
    expect(filter.dateInput.endDate).toBe("2026-06-28");
    expect(filter.dateFilter.start).toEqual(new Date("2025-12-31T17:00:00.000Z"));
    expect(filter.dateFilter.endExclusive).toEqual(new Date("2026-06-28T17:00:00.000Z"));
  });
});
