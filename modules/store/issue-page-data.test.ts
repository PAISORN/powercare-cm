import { beforeEach, describe, expect, it, vi } from "vitest";
import { StoreIssueStatus } from "./store-types";

const mocks = vi.hoisted(() => ({
  storeStock: { findMany: vi.fn() },
  storeApplicableZone: { findMany: vi.fn() },
  cmWork: { findMany: vi.fn() },
  sparePartIssue: { findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("../../lib/db", () => ({ db: mocks }));

import { loadIssuePageData } from "./issue-page-data";

const scope = { organizationId: "org-1", plantId: "plant-1" };
const trackingQuery = {
  search: "bearing",
  status: "WAITING" as const,
  itemKind: "SPARE_PART" as const,
  page: 3,
};

describe("Issue page data loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads only request-form data in create mode", async () => {
    mocks.storeStock.findMany.mockResolvedValue(["stock"]);
    mocks.storeApplicableZone.findMany.mockResolvedValue(["zone"]);
    mocks.cmWork.findMany.mockResolvedValue(["cm"]);

    const result = await loadIssuePageData({
      mode: "create",
      scope,
      viewerUserId: "user-1",
      canReviewAllIssues: false,
      trackingQuery,
    });

    expect(result.stocks).toEqual(["stock"]);
    expect(result.issueZones).toEqual(["zone"]);
    expect(result.cmWorks).toEqual(["cm"]);
    expect(result.pagedFilteredIssues).toEqual([]);
    expect(mocks.sparePartIssue.findMany).not.toHaveBeenCalled();
    expect(mocks.storeStock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ plantId: "plant-1" }),
      }),
    );
  });

  it("loads only visible tracking rows and clamps the requested page", async () => {
    mocks.sparePartIssue.findMany
      .mockResolvedValueOnce([
        { status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL },
        { status: StoreIssueStatus.ISSUED },
      ])
      .mockResolvedValueOnce(["issue"]);
    mocks.sparePartIssue.count.mockResolvedValue(51);

    const result = await loadIssuePageData({
      mode: "tracking",
      scope,
      viewerUserId: "user-1",
      canReviewAllIssues: false,
      trackingQuery,
    });

    expect(result.stocks).toEqual([]);
    expect(result.statusCounts).toEqual({
      all: 2,
      waiting: 1,
      inProgress: 0,
      completed: 1,
      canceled: 0,
    });
    expect(result.filteredIssueCount).toBe(51);
    expect(result.totalTrackingPages).toBe(2);
    expect(result.currentTrackingPage).toBe(2);
    expect(result.trackingQuery.page).toBe(2);
    expect(result.pagedFilteredIssues).toEqual(["issue"]);
    expect(mocks.storeStock.findMany).not.toHaveBeenCalled();
    expect(mocks.sparePartIssue.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        organizationId: "org-1",
        plantId: "plant-1",
        requesterUserId: "user-1",
        itemKind: "SPARE_PART",
        status: { in: [StoreIssueStatus.WAITING_ENGINEER_APPROVAL] },
      }),
    });
    expect(mocks.sparePartIssue.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: 50, take: 50 }),
    );
  });

  it("lets authorized reviewers see all requests in the selected site", async () => {
    mocks.sparePartIssue.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.sparePartIssue.count.mockResolvedValue(0);

    await loadIssuePageData({
      mode: "tracking",
      scope,
      viewerUserId: "reviewer-1",
      canReviewAllIssues: true,
      trackingQuery: { ...trackingQuery, search: "", status: "ALL", page: 1 },
    });

    const countArgs = mocks.sparePartIssue.count.mock.calls[0][0];
    expect(countArgs.where).not.toHaveProperty("requesterUserId");
  });
});
