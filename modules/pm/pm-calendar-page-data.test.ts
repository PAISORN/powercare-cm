import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPmCalendarPlans: vi.fn(),
  listAnnualPmCalendarEntries: vi.fn(),
  getPmPlanEditor: vi.fn(),
  previewDraftPmPlan: vi.fn(),
  previewAnnualPmRelease: vi.fn(),
  pmGroupFindMany: vi.fn(),
  pmAnnualPlanFindFirst: vi.fn(),
  pmAnnualScheduleCount: vi.fn(),
  assetFindMany: vi.fn(),
}));

vi.mock("./pm-calendar-query", () => ({
  listPmCalendarPlans: mocks.listPmCalendarPlans,
  listAnnualPmCalendarEntries: mocks.listAnnualPmCalendarEntries,
}));
vi.mock("./pm-plan-service", () => ({
  getPmPlanEditor: mocks.getPmPlanEditor,
  previewDraftPmPlan: mocks.previewDraftPmPlan,
}));
vi.mock("./pm-annual-phase2-service", () => ({
  previewAnnualPmRelease: mocks.previewAnnualPmRelease,
}));
vi.mock("../../lib/db", () => ({
  db: {
    pmGroup: { findMany: mocks.pmGroupFindMany },
    pmAnnualPlan: { findFirst: mocks.pmAnnualPlanFindFirst },
    pmAnnualSchedule: { count: mocks.pmAnnualScheduleCount },
    asset: { findMany: mocks.assetFindMany },
  },
}));

import { loadPmCalendarPageData } from "./pm-calendar-page-data";

const user = {
  id: "user-a",
  role: "SITE_ADMIN",
  organizationId: "org-a",
  plantId: "plant-a",
};
const scope = {
  organization: { id: "org-a", name: "Org A", slug: "org-a" },
  plant: { id: "plant-a", name: "Plant A", code: "PLA" },
  organizations: [],
  plants: [],
  canSelectOrganization: false,
  canSelectPlant: false,
};

describe("PM calendar page data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPmCalendarPlans.mockResolvedValue([
      { id: "plan-a", plannedDateKey: "2026-09-28" },
    ]);
    mocks.listAnnualPmCalendarEntries.mockResolvedValue([]);
    mocks.pmGroupFindMany.mockResolvedValue([{ id: "group-a" }]);
    mocks.pmAnnualPlanFindFirst.mockResolvedValue(null);
    mocks.getPmPlanEditor.mockResolvedValue({
      id: "plan-a",
      status: "DRAFT",
    });
    mocks.previewDraftPmPlan.mockResolvedValue({ planId: "plan-a" });
    mocks.assetFindMany.mockResolvedValue([]);
  });

  it("uses one resolved scope for calendar, editor, groups and links", async () => {
    const result = await loadPmCalendarPageData({
      user,
      scope,
      query: { planId: "plan-a" },
      month: "2026-09-01",
      selectedDate: "2026-09-28",
      canManage: true,
    });

    const serviceScope = { organizationId: "org-a", plantId: "plant-a" };
    expect(mocks.listPmCalendarPlans).toHaveBeenCalledWith(
      user,
      serviceScope,
      "2026-09-01",
    );
    expect(mocks.listAnnualPmCalendarEntries).toHaveBeenCalledWith(
      user,
      serviceScope,
      "2026-09-01",
    );
    expect(mocks.pmGroupFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ...serviceScope, active: true } }),
    );
    expect(mocks.getPmPlanEditor).toHaveBeenCalledWith(user, {
      ...serviceScope,
      planId: "plan-a",
    });
    expect(mocks.previewDraftPmPlan).toHaveBeenCalledWith(user, {
      ...serviceScope,
      planId: "plan-a",
    });
    expect(result.scopeQuery).toBe("organizationId=org-a&plantId=plant-a");
    expect(result.selectedPlanId).toBe("plan-a");
    expect(result.preview).toEqual({ planId: "plan-a" });
  });

  it("does not load management-only groups for a read-only PM viewer", async () => {
    mocks.getPmPlanEditor.mockResolvedValue(null);

    const result = await loadPmCalendarPageData({
      user,
      scope,
      query: {},
      month: "2026-09-01",
      selectedDate: "2026-09-27",
      canManage: false,
    });

    expect(mocks.pmGroupFindMany).not.toHaveBeenCalled();
    expect(mocks.assetFindMany).not.toHaveBeenCalled();
    expect(result.groups).toEqual([]);
  });
});
