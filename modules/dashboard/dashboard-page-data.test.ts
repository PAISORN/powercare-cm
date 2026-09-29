import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDashboardSummaryForDateFilter: vi.fn(),
  getUnreadSummary: vi.fn(),
  readOrganizationProfile: vi.fn(),
  readPlantProfile: vi.fn(),
}));

vi.mock("./dashboard-query", () => ({
  getDashboardSummaryForDateFilter: mocks.getDashboardSummaryForDateFilter,
}));
vi.mock("../notifications/notification-service", () => ({
  getUnreadSummary: mocks.getUnreadSummary,
}));
vi.mock("../organization/organization-service", () => ({
  readOrganizationProfile: mocks.readOrganizationProfile,
}));
vi.mock("../organization/plant-profile-service", () => ({
  readPlantProfile: mocks.readPlantProfile,
}));

import { loadCmDashboardPageData } from "./dashboard-page-data";

describe("CM dashboard page data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDashboardSummaryForDateFilter.mockResolvedValue({ total: 7 });
    mocks.getUnreadSummary.mockResolvedValue({ total: 3 });
    mocks.readPlantProfile.mockResolvedValue({ displayName: "Plant A" });
    mocks.readOrganizationProfile.mockResolvedValue({ companyName: "Org A" });
  });

  it("passes the same plant scope to dashboard and unread queries", async () => {
    const scope = { plantId: "plant-a" };
    const result = await loadCmDashboardPageData({
      userId: "user-a",
      scope,
      category: "electrical",
      reportDate: "2026-09-27",
    });

    expect(mocks.getDashboardSummaryForDateFilter).toHaveBeenCalledWith({
      category: "electrical",
      dateFilter: undefined,
      defaultTrendMonthCount: 12,
      reportDate: "2026-09-27",
      scope,
    });
    expect(mocks.getUnreadSummary).toHaveBeenCalledWith("user-a", scope);
    expect(mocks.readPlantProfile).toHaveBeenCalledWith("plant-a");
    expect(mocks.readOrganizationProfile).not.toHaveBeenCalled();
    expect(result.dashboardCompanyName).toBe("Plant A");
  });

  it("loads the organization profile for organization-wide scope", async () => {
    const result = await loadCmDashboardPageData({
      userId: "admin-a",
      scope: { organizationId: "org-a" },
    });

    expect(mocks.readOrganizationProfile).toHaveBeenCalledWith("org-a");
    expect(mocks.readPlantProfile).not.toHaveBeenCalled();
    expect(result.dashboardCompanyName).toBe("Org A");
  });
});
