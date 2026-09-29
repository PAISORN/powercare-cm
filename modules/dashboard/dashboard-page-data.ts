import { getUnreadSummary } from "../notifications/notification-service";
import { readOrganizationProfile } from "../organization/organization-service";
import { readPlantProfile } from "../organization/plant-profile-service";
import type { OperationalScope } from "../organization/user-plant-scope";
import {
  getDashboardSummaryForDateFilter,
  type DashboardCategoryFilter,
} from "./dashboard-query";
import type { ParsedCmDateFilter } from "../filters/cm-date-filter";

export type CmDashboardPageDataInput = {
  userId: string;
  scope: OperationalScope;
  category?: DashboardCategoryFilter;
  dateFilter?: ParsedCmDateFilter;
  reportDate?: string;
};

export async function loadCmDashboardPageData({
  userId,
  scope,
  category,
  dateFilter,
  reportDate,
}: CmDashboardPageDataInput) {
  const [summary, unreadSummary, dashboardProfile] = await Promise.all([
    getDashboardSummaryForDateFilter({
      category,
      dateFilter,
      defaultTrendMonthCount: 12,
      reportDate,
      scope,
    }),
    getUnreadSummary(userId, scope),
    scope.plantId
      ? readPlantProfile(scope.plantId)
      : readOrganizationProfile(scope.organizationId),
  ]);

  return {
    summary,
    unreadSummary,
    dashboardCompanyName:
      "displayName" in dashboardProfile
        ? dashboardProfile.displayName
        : dashboardProfile.companyName,
  };
}

export type CmDashboardPageData = Awaited<
  ReturnType<typeof loadCmDashboardPageData>
>;
