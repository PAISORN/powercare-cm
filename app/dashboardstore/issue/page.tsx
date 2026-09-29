import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { RestoreListPosition } from "../../../components/preserve-list-position";
import { requireUser } from "../../../lib/session";
import {
  canUseUserPermission,
  PermissionKey,
} from "../../../modules/auth/site-admin-permissions";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import { defaultInventoryItemKind } from "../../../modules/store/inventory-user-scope";
import { loadIssuePageData } from "../../../modules/store/issue-page-data";
import {
  buildIssueTrackingPositionKey,
  countIssueTrackingFilters,
  parseIssueTrackingQuery,
} from "../../../modules/store/issue-tracking-query";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import { IssueCreateWorkspace } from "./issue-create-workspace";
import { IssuePageFeedback } from "./issue-page-feedback";
import { IssuePageHeader } from "./issue-page-header";
import { IssueTrackingResults } from "./issue-tracking-results";

type PageQuery = {
  organizationId?: string;
  plantId?: string;
  created?: string;
  saved?: string;
  error?: string;
  q?: string;
  status?: string;
  trackingPage?: string;
  itemKind?: string;
  inspectIssueId?: string;
  view?: string;
};

export default async function IssuePage({
  searchParams,
}: {
  searchParams: Promise<PageQuery>;
}) {
  const user = await requireUser();
  const canCreate = canUseUserPermission(
    user,
    PermissionKey.CREATE_STORE_ISSUE,
  );
  const canApprove = canUseUserPermission(
    user,
    PermissionKey.APPROVE_STORE_ISSUE,
  );
  const canIssue = canUseUserPermission(user, PermissionKey.ISSUE_STOCK);
  const canTrack = canUseUserPermission(
    user,
    PermissionKey.VIEW_STORE_TRACKING,
  );
  const canOpenTracking = canTrack || canApprove || canIssue;
  const approvalKinds = new Set(
    user.role === RoleName.ADMIN
      ? ["SPARE_PART", "CHEMICAL", "OIL"]
      : user.inventoryScopes
          .filter((scope) => scope.approvalEnabled)
          .map((scope) => scope.itemKind),
  );
  const responsibilityKinds = new Set(
    user.role === RoleName.ADMIN
      ? ["SPARE_PART", "CHEMICAL", "OIL"]
      : user.inventoryScopes
          .filter((scope) => scope.responsibilityEnabled)
          .map((scope) => scope.itemKind),
  );
  const query = await searchParams;
  const trackingOnly = query.view === "tracking";
  if (trackingOnly && !canOpenTracking) redirect("/dashboardcm");
  if (!trackingOnly && !canCreate)
    redirect("/dashboardstore/issue?view=tracking");
  const scope = await resolveStorePageScope(user, query);

  const defaultTrackingKind = defaultInventoryItemKind(user);
  const parsedTrackingQuery = parseIssueTrackingQuery(
    query,
    defaultTrackingKind,
  );
  const trackingActiveFilterCount = countIssueTrackingFilters(
    parsedTrackingQuery,
    defaultTrackingKind,
  );
  const {
    stocks,
    issueZones,
    cmWorks,
    statusCounts,
    filteredIssueCount,
    totalTrackingPages,
    currentTrackingPage,
    trackingQuery,
    pagedFilteredIssues,
  } = await loadIssuePageData({
    mode: trackingOnly ? "tracking" : "create",
    scope: {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
    },
    viewerUserId: user.id,
    canReviewAllIssues: canApprove || canIssue,
    trackingQuery: parsedTrackingQuery,
  });
  const trackingScope = {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  };
  const trackingListPositionKey = buildIssueTrackingPositionKey(trackingScope);
  const issueRowPermissions = {
    canApprove,
    canIssue,
    approvalKinds: [...approvalKinds],
    responsibilityKinds: [...responsibilityKinds],
  };
  const issueRowViewer = {
    id: user.id,
    role: user.role,
    organizationId: user.organizationId,
    plantId: user.plantId,
  };

  return (
    <AppShell>
      <RestoreListPosition
        enabled={trackingOnly}
        key={`${trackingQuery.itemKind}:${trackingQuery.status}:${trackingQuery.search}:${trackingQuery.page}:${trackingQuery.inspectIssueId ?? ""}`}
        storageKey={trackingListPositionKey}
      />

      <IssuePageHeader
        activeFilterCount={trackingActiveFilterCount}
        query={trackingQuery}
        scope={scope}
        showCreateLink={canCreate}
        showTrackingLink={canOpenTracking}
        storageKey={trackingListPositionKey}
        trackingOnly={trackingOnly}
      />

      <IssuePageFeedback
        created={query.created}
        error={query.error}
        saved={query.saved}
      />

      {!trackingOnly ? (
        <IssueCreateWorkspace
          cmWorks={cmWorks}
          defaultItemKind={defaultTrackingKind}
          issueZones={issueZones}
          requestedItemKind={query.itemKind}
          requester={{
            name: user.fullName,
            department: user.category?.name,
          }}
          scope={scope}
          stocks={stocks}
        />
      ) : null}

      {trackingOnly ? (
        <IssueTrackingResults
          currentPage={currentTrackingPage}
          filteredIssueCount={filteredIssueCount}
          issues={pagedFilteredIssues}
          permissions={issueRowPermissions}
          query={trackingQuery}
          scope={scope}
          statusCounts={statusCounts}
          storageKey={trackingListPositionKey}
          totalPages={totalTrackingPages}
          viewer={issueRowViewer}
        />
      ) : null}
    </AppShell>
  );
}
