import { describe, expect, it } from "vitest";
import { WorkStatus } from "./cm-work-types";
import {
  buildPageHref,
  buildStatusFilterHref,
  buildWorkEditHref,
  buildWorkListHref,
  buildWorkScopeWhere,
  buildWorkWhere,
  getStatusDate,
  normalizePage,
  normalizeWorkFilters,
  type WorkSearchParams,
} from "./work-list-query";

describe("work list query model", () => {
  it("preserves list filters and page while opening and closing the edit drawer", () => {
    const filters: WorkSearchParams = {
      search: "PUMP",
      status: WorkStatus.IN_PROGRESS,
      categoryId: "cat-1",
      mode: "month",
      month: "2026-09",
      page: "3",
      editWorkId: "ignored-old-drawer",
    };

    expect(buildWorkListHref(filters)).toBe(
      "/work?search=PUMP&categoryId=cat-1&mode=month&month=2026-09&status=IN_PROGRESS&page=3",
    );
    expect(buildWorkEditHref(filters, "work-9")).toBe(
      "/work?search=PUMP&categoryId=cat-1&mode=month&month=2026-09&status=IN_PROGRESS&page=3&editWorkId=work-9#edit-work-drawer",
    );
    expect(buildPageHref(filters, 2)).toContain("page=2");
    expect(buildStatusFilterHref(filters, WorkStatus.CLOSED)).toContain(
      "status=CLOSED",
    );
  });

  it("normalizes query input and constrains invalid pages", () => {
    expect(
      normalizeWorkFilters({ search: "  motor  ", zoneId: "  " }),
    ).toEqual({ search: "motor" });
    expect(normalizePage("0")).toBe(1);
    expect(normalizePage("2")).toBe(2);
    expect(normalizePage("1.5")).toBe(1);
  });

  it("builds date, operational scope, search, and in-process filters", () => {
    const start = new Date("2026-09-01T00:00:00.000Z");
    const endExclusive = new Date("2026-10-01T00:00:00.000Z");
    const where = buildWorkWhere(
      { search: "PUMP", statusGroup: "IN_PROCESS", claimantId: "user-1" },
      {
        mode: "month",
        bucket: "day",
        includeTerminal: false,
        start,
        endExclusive,
      },
      { organizationId: "org-1", plantId: "plant-1" },
    );

    expect(where).toMatchObject({
      organizationId: "org-1",
      plantId: "plant-1",
      claimantId: "user-1",
      createdAt: { gte: start, lt: endExclusive },
      status: { in: expect.arrayContaining([WorkStatus.IN_PROGRESS]) },
      OR: expect.arrayContaining([{ number: { contains: "PUMP" } }]),
    });
    expect(buildWorkScopeWhere({ organizationId: "org-1" })).toEqual({
      organizationId: "org-1",
    });
    expect(
      buildWorkScopeWhere({ organizationId: "org-1", plantId: "plant-1" }),
    ).toEqual({ plantId: "plant-1" });
  });

  it("uses the status-specific timestamp with history as fallback", () => {
    const createdAt = new Date("2026-09-01T01:00:00.000Z");
    const changedAt = new Date("2026-09-02T01:00:00.000Z");
    expect(
      getStatusDate({
        status: WorkStatus.WAITING_TO_CLOSE,
        createdAt,
        claimedAt: null,
        inProgressAt: null,
        waitingToCloseAt: null,
        closedAt: null,
        canceledAt: null,
        statusHistory: [{ changedAt }],
      }),
    ).toEqual(changedAt);
  });
});
