import type { Actor } from "../cm-work/cm-work-types";
import type { resolveStorePageScope } from "../store/store-page-scope";

export type ActivityPageQuery = {
  activityPage?: string;
  activitySearch?: string;
  activitySort?: string;
  activityStatus?: string;
  activityType?: string;
  activityView?: string;
  organizationId?: string;
  plantId?: string;
  selectedActivity?: string;
  storeError?: string;
  storeSaved?: string;
};

export type ActivityScope = Awaited<ReturnType<typeof resolveStorePageScope>>;
export type ActivityView = "current" | "visual";
export type ActivityBoardItemType = "cm" | "store" | "review";
export type StoreSectionKey = "approve" | "issue" | "follow-up";

export type ActivityBoardFilter = {
  page: number;
  search: string;
  sort: "latest" | "oldest";
  status: string;
  type: "all" | "cm" | "store" | "review";
};

export type StoreIssueActivity = {
  id: string;
  number: string;
  status: string;
  requesterName: string;
  requestedAt: Date;
  items: Array<{
    id: string;
    requestedQty: unknown;
    approvedQty: unknown | null;
    issuedQty: unknown | null;
    sparePart: { code: string; name: string };
  }>;
};

export type ActivityWork = {
  id: string;
  number: string;
  categoryId: string;
  claimantId: string | null;
  plantId: string | null;
  machineName: string;
  problemTitle: string;
  category: { name: string };
  zone: { name: string };
  status: string;
  claimedAt: Date | null;
  inProgressAt: Date | null;
  waitingToCloseAt: Date | null;
  createdAt: Date;
  claimant: { fullName: string } | null;
};

export type ActivityFeedItem =
  | {
      kind: "work";
      key: string;
      title: string;
      subtitle: string;
      status: string;
      occurredAt: Date;
      work: ActivityWork;
      highlight?: boolean;
    }
  | {
      kind: "store";
      key: string;
      title: string;
      subtitle: string;
      status: string;
      occurredAt: Date;
      issue: StoreIssueActivity;
      sectionKey: StoreSectionKey;
    };

export type ActivityPageData = {
  actor: Actor;
  activityView: ActivityView;
  activityBoardFilters: ActivityBoardFilter;
  combinedActivities: ActivityFeedItem[];
  filteredBoardActivities: ActivityFeedItem[];
  selectedItem: ActivityFeedItem | null;
  ownedWorks: ActivityWork[];
  reviewWorks: ActivityWork[];
  storeSections: Array<{
    key: StoreSectionKey;
    title: string;
    issues: StoreIssueActivity[];
    emptyText: string;
  }>;
  totalActivities: number;
  totalStoreActivities: number;
};
