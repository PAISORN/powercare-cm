import { describe, expect, it, vi } from "vitest";
import { db } from "../../lib/db";
import { parsePmWorkFilter } from "./pm-filter";
import { buildPmWorkWhere, isPmWorkOverdue, queryPmWorkExport, queryPmWorkPage } from "./pm-query";

describe("PM work query", () => {
  it("builds a tenant-bounded where with every relationship filter", () => {
    const filter = parsePmWorkFilter(new URLSearchParams("startDate=2026-08-01&endDate=2026-08-31&groupId=g1&assetId=a1&assigneeId=u1&lifecycle=COMPLETED&result=ABNORMAL"));
    expect(buildPmWorkWhere(filter, { organizationId: "o1", plantId: "p1" })).toEqual(expect.objectContaining({
      plantId: "p1", assetId: "a1", status: "COMPLETED", result: "ABNORMAL",
      pmPlan: expect.objectContaining({ organizationId: "o1", plantId: "p1", plannedDateKey: { gte: "2026-08-01", lte: "2026-08-31" } }),
      assignees: { some: { userId: "u1" } },
    }));
  });

  it("uses the exact row where for total and scope-bounds every summary", async () => {
    const findMany = vi.spyOn(db.pmWork, "findMany").mockResolvedValue([]);
    const count = vi.spyOn(db.pmWork, "count").mockResolvedValue(0);
    const scope = { organizationId: "o1", plantId: "p1" };
    await queryPmWorkPage(parsePmWorkFilter(new URLSearchParams("overdue=1"), new Date("2026-08-15T10:00:00Z")), scope);
    expect(count).toHaveBeenCalledTimes(7);
    expect(count.mock.calls[0][0]?.where).toEqual(findMany.mock.calls[0][0]?.where);
    for (const call of count.mock.calls) expect(call[0]?.where).toEqual(expect.objectContaining({ plantId: "p1", pmPlan: expect.objectContaining({ organizationId: "o1", plantId: "p1" }) }));
    expect(count.mock.calls[4][0]?.where).toEqual(expect.objectContaining({ status: { in: ["PLANNED", "IN_PROGRESS"] }, pmPlan: expect.objectContaining({ plannedDateKey: { lt: "2026-08-15" } }) }));
  });

  it("makes overdue rows include Planned and In Progress at the same Bangkok boundary", () => {
    const filter = parsePmWorkFilter(new URLSearchParams("overdue=1&lifecycle=COMPLETED"), new Date("2026-08-15T17:00:00Z"));
    expect(buildPmWorkWhere(filter, { organizationId: "o1", plantId: "p1" })).toEqual(expect.objectContaining({ status: { in: ["PLANNED", "IN_PROGRESS"] }, pmPlan: expect.objectContaining({ plannedDateKey: { lt: "2026-08-16" } }) }));
    expect(isPmWorkOverdue("PLANNED", "2026-08-15", "2026-08-16")).toBe(true);
    expect(isPmWorkOverdue("IN_PROGRESS", "2026-08-15", "2026-08-16")).toBe(true);
    expect(isPmWorkOverdue("COMPLETED", "2026-08-15", "2026-08-16")).toBe(false);
    expect(isPmWorkOverdue("IN_PROGRESS", "2026-08-16", "2026-08-16")).toBe(false);
  });

  it("bounds CSV export with one sentinel row and keeps the scoped filter", async () => {
    const findMany = vi.spyOn(db.pmWork, "findMany").mockResolvedValue(Array.from({ length: 3 }, (_, id) => ({ id })) as never);
    await expect(queryPmWorkExport(parsePmWorkFilter(new URLSearchParams("assetId=a1")), { organizationId: "o1", plantId: "p1" }, 2)).resolves.toMatchObject({ exceeded: true, rows: [{ id: 0 }, { id: 1 }] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3, where: expect.objectContaining({ plantId: "p1", assetId: "a1", pmPlan: expect.objectContaining({ organizationId: "o1", plantId: "p1" }) }) }));
  });
});
