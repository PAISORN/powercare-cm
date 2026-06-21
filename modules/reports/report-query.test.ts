import { describe, expect, it } from "vitest";
import { parseReportFilter } from "./report-filter";
import { buildReportWhere } from "./report-query";

describe("buildReportWhere", () => {
  it("maps the normalized report filter to one Prisma where contract", () => {
    const filter = parseReportFilter(
      new URLSearchParams(
        "mode=range&startDate=2026-06-01&endDate=2026-06-19&status=IN_PROGRESS&categoryId=cat-1&zoneId=zone-1&urgency=URGENT&claimantId=user-1&requester=Somchai&department=Operations&machineName=Pump&number=CM-2026",
      ),
    );

    expect(buildReportWhere(filter)).toEqual({
      createdAt: { gte: new Date("2026-05-31T17:00:00.000Z"), lt: new Date("2026-06-19T17:00:00.000Z") },
      status: "IN_PROGRESS",
      categoryId: "cat-1",
      zoneId: "zone-1",
      urgency: "URGENT",
      claimantId: "user-1",
      requesterName: { contains: "Somchai" },
      requesterDepartment: { contains: "Operations" },
      machineName: { contains: "Pump" },
      number: { contains: "CM-2026" },
    });
  });
});
