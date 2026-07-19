import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowDownUp,
  ArrowRight,
  Boxes,
  Building2,
  ClipboardCheck,
  Clock3,
  LayoutGrid,
  List,
  ListFilter,
  Search,
  ShoppingCart,
  Wrench,
  X,
} from "lucide-react";
import { AdminScopeHiddenFields, AdminSiteScopeSelector } from "../../components/admin-site-scope-selector";
import { AppShell } from "../../components/app-shell";
import { StatusBadge } from "../../components/status-badge";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import { adminScopeSearchFromFormData } from "../../modules/admin/admin-site-scope";
import { canCloseWork } from "../../modules/auth/permission";
import { canUseUserPermission, PermissionKey } from "../../modules/auth/site-admin-permissions";
import { RoleName, WorkStatus, type Actor } from "../../modules/cm-work/cm-work-types";
import { closeWork, moveToInProgress, returnForCorrection, submitForReview } from "../../modules/cm-work/cm-work-service";
import {
  approveStoreIssue,
  cancelStoreIssue,
  issueStoreStock,
  markIssueNotEnoughStock,
} from "../../modules/store/store-issue-prisma";
import { resolveStorePageScope } from "../../modules/store/store-page-scope";
import { StoreIssueStatus } from "../../modules/store/store-types";

const ACTIVE_OWNER_STATUSES: string[] = [
  WorkStatus.CLAIMED,
  WorkStatus.IN_PROGRESS,
  WorkStatus.RETURNED_FOR_CORRECTION,
];
const PENDING_STORE_ISSUE_STATUSES: string[] = [
  StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
  StoreIssueStatus.WAITING_STORE_ISSUE,
  StoreIssueStatus.PARTIALLY_ISSUED,
  StoreIssueStatus.RETURNED_FOR_EDIT,
];

type PageQuery = {
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

type StoreIssueActivity = {
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

type ActivityScope = Awaited<ReturnType<typeof resolveStorePageScope>>;
type ActivityBoardFilter = {
  page: number;
  search: string;
  sort: "latest" | "oldest";
  status: string;
  type: "all" | "cm" | "store" | "review";
};
type ActivityBoardItemType = "cm" | "store" | "review";
type ActivityView = "current" | "visual";
type StoreSectionKey = "approve" | "issue" | "follow-up";
type ActivityFeedItem =
  | {
      kind: "work";
      key: string;
      title: string;
      subtitle: string;
      status: string;
      occurredAt: Date;
      work: Parameters<typeof ActivityCard>[0]["work"];
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

async function engineerDecisionFromActivity(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  try {
    await approveStoreIssue(
      user,
      storeScopeFromActivity(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("decision") ?? "") as "APPROVE" | "REJECT" | "RETURN",
      optionalActivityText(formData.get("reason")),
    );
  } catch (error) {
    redirect(activityRedirect(scope, { storeError: activityActionError(error) }));
  }
  redirect(activityRedirect(scope, { storeSaved: "engineer" }));
}

async function issueStockFromActivity(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const itemIds = formData.getAll("itemId").map(String);
  const quantities = formData.getAll("issueQty").map(Number);
  try {
    await issueStoreStock(
      user,
      storeScopeFromActivity(scope),
      String(formData.get("issueId") ?? ""),
      itemIds.map((itemId, index) => ({ itemId, quantity: quantities[index] })),
    );
  } catch (error) {
    redirect(activityRedirect(scope, { storeError: activityActionError(error) }));
  }
  redirect(activityRedirect(scope, { storeSaved: "issued" }));
}

async function notEnoughStockFromActivity(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  try {
    await markIssueNotEnoughStock(
      user,
      storeScopeFromActivity(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    redirect(activityRedirect(scope, { storeError: activityActionError(error) }));
  }
  redirect(activityRedirect(scope, { storeSaved: "not-enough" }));
}

async function cancelStoreIssueFromActivity(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  try {
    await cancelStoreIssue(
      user,
      storeScopeFromActivity(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    redirect(activityRedirect(scope, { storeError: activityActionError(error) }));
  }
  redirect(activityRedirect(scope, { storeSaved: "canceled" }));
}

async function startWorkFromActivity(formData: FormData) {
  "use server";
  const { actor, scope } = await activityActionContext(formData);
  try {
    await moveToInProgress(actor, String(formData.get("cmWorkId") ?? ""));
  } catch (error) {
    redirect(activityRedirect(scope, { activityView: "visual", storeError: activityActionError(error) }));
  }
  redirect(activityRedirect(scope, { activityView: "visual" }));
}

async function submitWorkReviewFromActivity(formData: FormData) {
  "use server";
  const { actor, scope } = await activityActionContext(formData);
  const cmWorkId = String(formData.get("cmWorkId") ?? "");
  const pendingCount = await db.sparePartIssue.count({
    where: { cmWorkId, status: { in: PENDING_STORE_ISSUE_STATUSES } },
  });
  if (pendingCount > 0) {
    redirect(activityRedirect(scope, { activityView: "visual", storeError: "Please finish pending store issues first." }));
  }
  try {
    await submitForReview(actor, cmWorkId, {
      correctiveAction: String(formData.get("correctiveAction") ?? ""),
      rootCause: String(formData.get("rootCause") ?? ""),
      workNote: optionalActivityText(formData.get("workNote")) ?? undefined,
    });
  } catch (error) {
    redirect(activityRedirect(scope, { activityView: "visual", storeError: activityActionError(error) }));
  }
  redirect(activityRedirect(scope, { activityView: "visual" }));
}

async function closeWorkFromActivity(formData: FormData) {
  "use server";
  const { actor, scope } = await activityActionContext(formData);
  try {
    await closeWork(actor, String(formData.get("cmWorkId") ?? ""), String(formData.get("engineerNote") ?? ""));
  } catch (error) {
    redirect(activityRedirect(scope, { activityView: "visual", storeError: activityActionError(error) }));
  }
  redirect(activityRedirect(scope, { activityView: "visual" }));
}

async function returnWorkFromActivity(formData: FormData) {
  "use server";
  const { actor, scope } = await activityActionContext(formData);
  try {
    await returnForCorrection(
      actor,
      String(formData.get("cmWorkId") ?? ""),
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    redirect(activityRedirect(scope, { activityView: "visual", storeError: activityActionError(error) }));
  }
  redirect(activityRedirect(scope, { activityView: "visual" }));
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<PageQuery>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const activityView = query.activityView === "current" ? "current" : "visual";
  const actor: Actor = {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    plantId: scope.plant.id,
    siteAdminPermissions: user.siteAdminPermissions,
  };
  const userCategoryIds = [
    ...new Set(
      [user.categoryId, ...user.categories.map((category) => category.categoryId)].filter(Boolean) as string[],
    ),
  ];
  const canApproveStore = canUseUserPermission(user, PermissionKey.APPROVE_STORE_ISSUE);
  const canIssueStore = canUseUserPermission(user, PermissionKey.ISSUE_STOCK);

  const [ownedWorks, waitingCloseWorks, approvalIssues, issueQueueIssues, requesterFollowUpIssues] =
    await Promise.all([
      db.cmWork.findMany({
        where: {
          organizationId: scope.organization.id,
          plantId: scope.plant.id,
          claimantId: user.id,
          status: { in: ACTIVE_OWNER_STATUSES },
        },
        include: { category: true, zone: true, claimant: true },
        orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
        take: 30,
      }),
      db.cmWork.findMany({
        where: {
          organizationId: scope.organization.id,
          plantId: scope.plant.id,
          status: WorkStatus.WAITING_TO_CLOSE,
          ...(user.role === RoleName.ENGINEER ? { categoryId: { in: userCategoryIds } } : {}),
        },
        include: { category: true, zone: true, claimant: true },
        orderBy: [{ waitingToCloseAt: "asc" }, { createdAt: "asc" }],
        take: 30,
      }),
      canApproveStore
        ? db.sparePartIssue.findMany({
            where: {
              organizationId: scope.organization.id,
              plantId: scope.plant.id,
              status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
            },
            include: { items: { include: { sparePart: { select: { code: true, name: true } } } } },
            orderBy: { requestedAt: "asc" },
            take: 30,
          })
        : Promise.resolve([]),
      canIssueStore
        ? db.sparePartIssue.findMany({
            where: {
              organizationId: scope.organization.id,
              plantId: scope.plant.id,
              status: { in: [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED] },
            },
            include: { items: { include: { sparePart: { select: { code: true, name: true } } } } },
            orderBy: { requestedAt: "asc" },
            take: 30,
          })
        : Promise.resolve([]),
      db.sparePartIssue.findMany({
        where: {
          organizationId: scope.organization.id,
          plantId: scope.plant.id,
          requesterUserId: user.id,
          status: { in: [StoreIssueStatus.RETURNED_FOR_EDIT, StoreIssueStatus.NOT_ENOUGH_STOCK] },
        },
        include: { items: { include: { sparePart: { select: { code: true, name: true } } } } },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
    ]);

  const reviewWorks = waitingCloseWorks.filter((work) => canCloseWork(actor, work));
  const progressWorks = ownedWorks.filter((work) => needsProgressUpdate(work));
  const storeSections = buildStoreSections({
    approvalIssues,
    issueQueueIssues,
    requesterFollowUpIssues,
  });
  const totalStoreActivities = storeSections.reduce((total, section) => total + section.issues.length, 0);
  const totalActivities = ownedWorks.length + reviewWorks.length + totalStoreActivities;
  const combinedActivities: ActivityFeedItem[] = [
    ...ownedWorks.map((work) => ({
      kind: "work" as const,
      key: `owned-${work.id}`,
      title: work.number,
      subtitle: `${work.problemTitle} · ${work.category.name} · ${work.zone.name}`,
      status: work.status,
      occurredAt: work.inProgressAt ?? work.claimedAt ?? work.createdAt,
      work,
      highlight: needsProgressUpdate(work),
    })),
    ...reviewWorks.map((work) => ({
      kind: "work" as const,
      key: `review-${work.id}`,
      title: work.number,
      subtitle: `Waiting close · ${work.problemTitle} · ${work.category.name}`,
      status: work.status,
      occurredAt: work.waitingToCloseAt ?? work.createdAt,
      work,
    })),
    ...approvalIssues.map((issue) => storeFeedItem(issue, "approve")),
    ...issueQueueIssues.map((issue) => storeFeedItem(issue, "issue")),
    ...requesterFollowUpIssues.map((issue) => storeFeedItem(issue, "follow-up")),
  ].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const activityBoardFilters = resolveActivityBoardFilters(query);
  const filteredBoardActivities = filterActivityBoardItems(combinedActivities, activityBoardFilters);
  const selectedItem = query.selectedActivity
    ? combinedActivities.find((item) => item.key === query.selectedActivity) ?? null
    : null;

  return (
    <AppShell>
      <div className="page-enter">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-bold text-[var(--primary)]">
              <ClipboardCheck size={16} /> My Activities
            </p>
            <h1 className="mt-3 text-3xl font-bold">งานที่ต้องดำเนินการ</h1>
            <p className="mt-1 text-[var(--muted)]">
              รวมงานที่รับผิดชอบ งานที่ต้องอัปเดต งานรอตรวจรับ/ปิดงาน และคิวงาน Store
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-right shadow-[var(--shadow)]">
            <p className="text-sm font-semibold text-[var(--muted)]">Total Activities</p>
            <p className="text-3xl font-extrabold">{totalActivities}</p>
          </div>
        </div>

        <div className="hidden">
          <AdminSiteScopeSelector
            action="/activities"
            scope={scope}
            title="Site สำหรับกิจกรรมที่ต้องทำ"
            description="เลือก Organization และ Site เพื่อดูงานถัดไปที่ต้องดำเนินการของแต่ละบทบาท"
          />
        </div>

        {query.storeSaved ? (
          <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            บันทึกกิจกรรม Store เรียบร้อยแล้ว
          </p>
        ) : null}
        {query.storeError ? (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300" role="alert">
            ดำเนินการ Store ไม่สำเร็จ: {query.storeError}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActivityMetric label="รับผิดชอบอยู่" value={ownedWorks.length} tone="blue" />
          <ActivityMetric label="ควรอัปเดตงาน" value={progressWorks.length} tone="amber" />
          <ActivityMetric label="งานรอตรวจรับ/ปิดงาน" value={reviewWorks.length} tone="green" />
          <ActivityMetric label="กิจกรรม Store" value={totalStoreActivities} tone="purple" />
        </div>

        <section className="reveal-on-scroll mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle icon={<Clock3 size={18} />} title="กิจกรรมทั้งหมด" count={combinedActivities.length} />
            <ActivityViewToggle currentView={activityView} scope={scope} />
          </div>
          <div className="mt-4">
            {activityView === "visual" ? (
              <ActivityBoardView
                allItems={combinedActivities}
                filters={activityBoardFilters}
                items={filteredBoardActivities}
                scope={scope}
                selectedKey={selectedItem?.key}
              />
            ) : (
              <UnifiedActivityList items={combinedActivities} scope={scope} selectedKey={selectedItem?.key} />
            )}
          </div>
        </section>

        {selectedItem ? (
          <ActivityActionDrawer
            actor={actor}
            closeHref={activityCloseHref(scope, activityBoardFilters, activityView)}
            item={selectedItem}
            scope={scope}
          />
        ) : null}

        <section className="hidden reveal-on-scroll mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <SectionTitle icon={<Clock3 size={18} />} title="งานที่รับผิดชอบอยู่" count={ownedWorks.length} />
          <div className="mt-4 grid gap-3">
            {ownedWorks.length ? (
              ownedWorks.map((work) => (
                <ActivityCard key={work.id} work={work} highlight={needsProgressUpdate(work)} />
              ))
            ) : (
              <EmptyState text="ยังไม่มีงานที่รับผิดชอบอยู่" />
            )}
          </div>
        </section>

        <section className="hidden reveal-on-scroll mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <SectionTitle
            icon={<Boxes size={18} />}
            title="กิจกรรม Store / ใบเบิกอะไหล่"
            count={totalStoreActivities}
          />
          <div className="mt-4 space-y-5">
            {storeSections.length ? (
              storeSections.map((storeSection) => (
                <div className="space-y-3" key={storeSection.key}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-extrabold text-[var(--ink)]">{storeSection.title}</h3>
                    <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-xs font-bold text-[var(--muted)]">
                      {storeSection.issues.length} รายการ
                    </span>
                  </div>
                  <div className="grid gap-3">
                    {storeSection.issues.length ? (
                      storeSection.issues.map((issue) => (
                        <StoreIssueActivityCard
                          issue={issue}
                          scope={scope}
                          sectionKey={storeSection.key}
                          key={issue.id}
                        />
                      ))
                    ) : (
                      <EmptyState text={storeSection.emptyText} />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text="ยังไม่มีกิจกรรม Store ที่ต้องดำเนินการ" />
            )}
          </div>
        </section>

        <section className="hidden reveal-on-scroll mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <SectionTitle
            icon={<ClipboardCheck size={18} />}
            title="งานรอตรวจรับ/ปิดงาน"
            count={reviewWorks.length}
          />
          <div className="mt-4 grid gap-3">
            {reviewWorks.length ? (
              reviewWorks.map((work) => <ActivityCard key={work.id} work={work} />)
            ) : (
              <EmptyState text="ยังไม่มีงานรอตรวจรับ/ปิดงาน" />
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function storeFeedItem(issue: StoreIssueActivity, sectionKey: StoreSectionKey): ActivityFeedItem {
  const statusLabels: Record<StoreSectionKey, string> = {
    approve: "รอ Engineer อนุมัติ",
    issue: "รอ Store จ่าย",
    "follow-up": "ส่งกลับ / ของไม่พอ",
  };
  return {
    kind: "store",
    key: `store-${sectionKey}-${issue.id}`,
    title: issue.number,
    subtitle: `${statusLabels[sectionKey]} · ${issue.requesterName} · ${issue.items.map((item) => item.sparePart.code).join(", ")}`,
    status: issue.status,
    occurredAt: issue.requestedAt,
    issue,
    sectionKey,
  };
}

function ActivityViewToggle({
  currentView,
  scope,
}: {
  currentView: ActivityView;
  scope: ActivityScope;
}) {
  const options: Array<{ label: string; value: ActivityView }> = [
    { label: "แบบปัจจุบัน", value: "current" },
    { label: "แบบการ์ด", value: "visual" },
  ];
  return (
    <div className="inline-flex rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-1 text-sm font-bold">
      {options.map((option) => {
        const active = currentView === option.value;
        const Icon = option.value === "current" ? List : LayoutGrid;
        return (
          <Link
            aria-label={option.value === "current" ? "List view" : "Card view"}
            className={`inline-flex size-11 items-center justify-center rounded-xl transition ${
              active
                ? "bg-[var(--primary)] text-white shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            }`}
            href={activityRedirect(scope, { activityView: option.value })}
            key={option.value}
            title={option.value === "current" ? "List view" : "Card view"}
          >
            <Icon size={20} />
          </Link>
        );
      })}
    </div>
  );
}

function ActivityBoardView({
  allItems,
  filters,
  items,
  scope,
  selectedKey,
}: {
  allItems: ActivityFeedItem[];
  filters: ActivityBoardFilter;
  items: ActivityFeedItem[];
  scope: ActivityScope;
  selectedKey?: string;
}) {
  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(filters.page, totalPages);
  const visibleItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const counts = {
    all: allItems.length,
    cm: allItems.filter((item) => activityBoardType(item) === "cm").length,
    store: allItems.filter((item) => activityBoardType(item) === "store").length,
    review: allItems.filter((item) => activityBoardType(item) === "review").length,
  };
  const tabs: Array<{ label: string; value: ActivityBoardFilter["type"] }> = [
    { label: "ทั้งหมด", value: "all" },
    { label: "CM", value: "cm" },
    { label: "Store", value: "store" },
    { label: "ตรวจรับ", value: "review" },
  ];
  const startItem = visibleItems.length ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, items.length);

  return (
    <div className="activity-board-view rounded-3xl border border-[var(--line)] bg-[var(--bg)]/35 p-4 shadow-inner">
      <div className="activity-board-toolbar grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="activity-board-tabs flex flex-wrap overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
          {tabs.map((tab) => {
            const active = filters.type === tab.value;
            return (
              <Link
                className={`min-h-12 border-r border-[var(--line)] px-5 py-3 text-sm font-extrabold transition last:border-r-0 ${
                  active
                    ? "bg-[var(--primary)]/15 text-[var(--primary)] shadow-[inset_0_-2px_0_var(--primary)]"
                    : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"
                }`}
                href={activityBoardRedirect(scope, { ...filters, page: 1, type: tab.value })}
                key={tab.value}
              >
                {tab.label} <span className="ml-2">{counts[tab.value]}</span>
              </Link>
            );
          })}
        </div>

        <form action="/activities" className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_170px_130px_120px]">
          <input name="activityView" type="hidden" value="visual" />
          <input name="organizationId" type="hidden" value={scope.organization.id} />
          <input name="plantId" type="hidden" value={scope.plant.id} />
          <input name="activityType" type="hidden" value={filters.type} />
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={19} />
            <input
              className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] pl-12 pr-4 text-sm font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
              defaultValue={filters.search}
              name="activitySearch"
              placeholder="ค้นหาเลขที่งานหรืออุปกรณ์"
            />
          </label>
          <div className="hidden">
            <Building2 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
            ไซต์ทั้งหมด
          </div>
          <label className="relative block">
            <ListFilter className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
            <select
              className="min-h-12 w-full appearance-none rounded-2xl border border-[var(--line)] bg-[var(--surface)] pl-11 pr-4 text-sm font-bold text-[var(--ink)] outline-none"
              defaultValue={filters.status}
              name="activityStatus"
            >
              <option value="all">สถานะทั้งหมด</option>
              {Array.from(new Set(allItems.map((item) => item.status))).map((status) => (
                <option key={status} value={status}>{activityStatusLabel(status)}</option>
              ))}
            </select>
          </label>
          <label className="relative block">
            <ArrowDownUp className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
            <select
              className="min-h-12 w-full appearance-none rounded-2xl border border-[var(--line)] bg-[var(--surface)] pl-11 pr-4 text-sm font-bold text-[var(--ink)] outline-none"
              defaultValue={filters.sort}
              name="activitySort"
            >
              <option value="latest">ล่าสุด</option>
              <option value="oldest">เก่าสุด</option>
            </select>
          </label>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--primary-strong)]">
            <Search size={17} />
            ค้นหา
          </button>
        </form>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <ActivityBoardCard
              item={item}
              key={item.key}
              scope={scope}
              selected={selectedKey === item.key}
              selectionHref={activitySelectionHref(scope, filters, item.key)}
            />
          ))
        ) : (
          <div className="2xl:col-span-3 lg:col-span-2">
            <EmptyState text="ไม่พบกิจกรรมตามเงื่อนไขที่เลือก" />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--muted)]">
          แสดง {startItem}-{endItem} จาก {items.length} งาน
        </p>
        <div className="flex items-center gap-2">
          <Link
            aria-disabled={currentPage <= 1}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--line)] font-extrabold transition hover:border-[var(--primary)] hover:text-[var(--primary)] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            href={activityBoardRedirect(scope, { ...filters, page: Math.max(1, currentPage - 1) })}
          >
            ‹
          </Link>
          {Array.from({ length: totalPages }).slice(0, 4).map((_, index) => {
            const page = index + 1;
            return (
              <Link
                className={`inline-flex size-11 items-center justify-center rounded-xl border text-sm font-extrabold transition ${
                  currentPage === page
                    ? "border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary)]"
                    : "border-[var(--line)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                }`}
                href={activityBoardRedirect(scope, { ...filters, page })}
                key={page}
              >
                {page}
              </Link>
            );
          })}
          <Link
            aria-disabled={currentPage >= totalPages}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--line)] font-extrabold transition hover:border-[var(--primary)] hover:text-[var(--primary)] aria-disabled:pointer-events-none aria-disabled:opacity-40"
            href={activityBoardRedirect(scope, { ...filters, page: Math.min(totalPages, currentPage + 1) })}
          >
            ›
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActivityBoardCard({
  item,
  selected,
  selectionHref,
  scope,
}: {
  item: ActivityFeedItem;
  selected: boolean;
  selectionHref: string;
  scope: ActivityScope;
}) {
  const type = activityBoardType(item);
  const accentClass = {
    cm: "from-cyan-400 to-blue-500",
    review: "from-emerald-400 to-green-500",
    store: "from-violet-400 to-fuchsia-500",
  }[type];
  const iconClass = {
    cm: Wrench,
    review: ClipboardCheck,
    store: ShoppingCart,
  }[type];
  const Icon = iconClass;
  const title = item.kind === "work" ? item.work.problemTitle : item.issue.items[0]?.sparePart.name ?? item.title;
  const subline = item.kind === "work" ? item.work.category.name : "Store";

  return (
    <Link
      className={`activity-board-card group relative block overflow-hidden rounded-3xl border bg-[var(--surface)] p-5 text-[var(--ink)] shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-[var(--shadow)] ${
        selected ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : "border-[var(--line)]"
      }`}
      href={selectionHref}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${accentClass}`} />
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--soft)] text-[var(--ink)]">
          <Icon size={31} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-semibold text-[var(--muted)]">{item.title}</p>
          <h3 className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight">{title}</h3>
          <p className="mt-2 truncate text-sm font-semibold text-[var(--muted)]">
            {scope.plant.name} <span className="mx-2">•</span> {subline}
          </p>
          <p className="hidden">
            <Clock3 size={16} />
            ครบกำหนด {formatThaiDateTime(item.occurredAt)}
          </p>
        </div>
        <div className="flex flex-col items-end justify-between gap-4">
          <span className={`rounded-xl border px-3 py-1 text-xs font-extrabold ${activityStatusPillClass(item.status, type)}`}>
            {type === "store" ? "Store" : activityStatusLabel(item.status)}
          </span>
          <span
            className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--soft)] transition group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]"
          >
            <ArrowRight size={22} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function UnifiedActivityList({
  items,
  scope,
  selectedKey,
  variant = "current",
}: {
  items: ActivityFeedItem[];
  scope: ActivityScope;
  selectedKey?: string;
  variant?: ActivityView;
}) {
  if (!items.length) return <EmptyState text="ยังไม่มีกิจกรรมที่ต้องดำเนินการ" />;
  return (
    <div className={variant === "visual" ? "activity-card-view grid gap-3 xl:grid-cols-2" : "grid gap-2"}>
      {items.map((item) => (
        <ActivityFeedRow item={item} key={item.key} scope={scope} selected={selectedKey === item.key} variant={variant} />
      ))}
    </div>
  );
}

function ActivityFeedRow({
  item,
  scope,
  selected,
  variant = "current",
}: {
  item: ActivityFeedItem;
  scope: ActivityScope;
  selected: boolean;
  variant?: ActivityView;
}) {
  const selectionHref = activitySelectionHref(scope, undefined, item.key, "current");
  const rowClass =
    variant === "visual"
      ? "activity-card-view group rounded-3xl border border-[var(--line)] bg-[var(--soft)]/70 transition duration-300 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-[var(--shadow)]"
      : "activity-row-two-line group rounded-2xl border border-[var(--line)] bg-[var(--soft)] transition hover:-translate-y-0.5 hover:border-[var(--primary)]";
  return (
    <Link
      className={`${rowClass} block text-[var(--ink)] ${selected ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20" : ""}`}
      href={selectionHref}
    >
      <div className={variant === "visual" ? "grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" : "grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"}>
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold">{item.title}</p>
          <p className="mt-1 truncate text-sm text-[var(--muted)]">{item.subtitle}</p>
          {variant === "visual" ? (
            <p className="hidden">{formatThaiDateTime(item.occurredAt)}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.kind === "work" && item.highlight ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">ควรอัปเดต</span>
          ) : null}
          {item.kind === "work" ? <StatusBadge status={item.status} /> : (
            <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--primary)]">Store</span>
          )}
          <span className="inline-flex size-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] transition group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]">
            <ArrowRight size={18} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ActivityActionDrawer({
  actor,
  closeHref,
  item,
  scope,
}: {
  actor: Actor;
  closeHref: string;
  item: ActivityFeedItem | null;
  scope: ActivityScope;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm">
      <Link aria-label="Close action panel" className="absolute inset-0" href={closeHref} />
      <aside
        className="activity-action-drawer relative ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-4 shadow-2xl animate-in slide-in-from-right duration-300 sm:p-5"
        id="activity-action-drawer"
      >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">Action Panel</p>
          <h3 className="mt-1 text-xl font-extrabold">ดำเนินการในหน้านี้</h3>
        </div>
        <Link
          aria-label="Close action panel"
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--soft)] text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          href={closeHref}
        >
          <X size={20} />
        </Link>
      </div>

      {!item ? (
        <div className="mt-4">
          <EmptyState text="เลือกกิจกรรมด้านซ้ายเพื่อเปิดรายการทำงาน" />
        </div>
      ) : item.kind === "store" ? (
        <div className="mt-4 grid gap-4">
          <ActivityDrawerSummary item={item} />
          <StoreIssueActivityCard issue={item.issue} scope={scope} sectionKey={item.sectionKey} />
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          <ActivityDrawerSummary item={item} />
          <WorkActivityPanel actor={actor} work={item.work} highlight={item.highlight} scope={scope} />
        </div>
      )}
      </aside>
    </div>
  );
}

function ActivityDrawerSummary({ item }: { item: ActivityFeedItem }) {
  const type = activityBoardType(item);
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-bold text-[var(--muted)]">{item.title}</p>
          <h4 className="mt-1 text-lg font-extrabold">{item.kind === "work" ? item.work.problemTitle : item.issue.items[0]?.sparePart.name ?? item.title}</h4>
        </div>
        <span className={`rounded-xl border px-3 py-1 text-xs font-extrabold ${activityStatusPillClass(item.status, type)}`}>
          {type === "store" ? "Store" : activityStatusLabel(item.status)}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--muted)]">{item.subtitle}</p>
      <p className="hidden">
        <Clock3 size={15} />
        {formatThaiDateTime(item.occurredAt)}
      </p>
    </div>
  );
}

function WorkActivityPanel({
  actor,
  work,
  highlight,
  scope,
}: {
  actor: Actor;
  work: Parameters<typeof ActivityCard>[0]["work"];
  highlight?: boolean;
  scope: ActivityScope;
}) {
  const isClaimant = work.claimantId === actor.id;
  const canStart = isClaimant && work.status === WorkStatus.CLAIMED;
  const canSubmitForReview =
    isClaimant && (work.status === WorkStatus.IN_PROGRESS || work.status === WorkStatus.RETURNED_FOR_CORRECTION);
  const canReview = canCloseWork(actor, work);
  const hasAnyAction = canStart || canSubmitForReview || canReview;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
      <div className="grid gap-3 text-sm">
        <InfoLine label="เครื่องจักร" value={work.machineName} />
        <InfoLine label="Category / Zone" value={`${work.category.name} / ${work.zone.name}`} />
        <InfoLine label="ผู้รับงาน" value={work.claimant?.fullName ?? "-"} />
      </div>
      {highlight ? (
        <p className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-600">
          งานนี้ควรอัปเดตความคืบหน้าแล้ว
        </p>
      ) : null}
      <div className="mt-4 grid gap-3">
        {canStart ? (
          <form action={startWorkFromActivity}>
            <AdminScopeHiddenFields scope={scope} />
            <input name="cmWorkId" type="hidden" value={work.id} />
            <button className="min-h-11 w-full rounded-xl bg-[var(--primary)] px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]">
              เริ่มดำเนินการ
            </button>
          </form>
        ) : null}

        {canSubmitForReview ? (
          <form action={submitWorkReviewFromActivity} className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <AdminScopeHiddenFields scope={scope} />
            <input name="cmWorkId" type="hidden" value={work.id} />
            <label className="grid gap-1 text-xs font-bold text-[var(--muted)]">
              สาเหตุ
              <textarea className={activityTextareaClass} name="rootCause" required />
            </label>
            <label className="grid gap-1 text-xs font-bold text-[var(--muted)]">
              วิธีการแก้ไข
              <textarea className={activityTextareaClass} name="correctiveAction" required />
            </label>
            <label className="grid gap-1 text-xs font-bold text-[var(--muted)]">
              หมายเหตุ
              <textarea className={activityTextareaClass} name="workNote" />
            </label>
            <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]">
              ส่งรอตรวจรับ/ปิดงาน
            </button>
          </form>
        ) : null}

        {canReview ? (
          <div className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <form action={closeWorkFromActivity} className="grid gap-2">
              <AdminScopeHiddenFields scope={scope} />
              <input name="cmWorkId" type="hidden" value={work.id} />
              <textarea className={activityTextareaClass} name="engineerNote" placeholder="หมายเหตุวิศวกร" />
              <button className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700">
                ปิดงาน
              </button>
            </form>
            <form action={returnWorkFromActivity} className="grid gap-2">
              <AdminScopeHiddenFields scope={scope} />
              <input name="cmWorkId" type="hidden" value={work.id} />
              <input className={activityInputClass} name="reason" placeholder="เหตุผลส่งกลับให้แก้ไข" required />
              <button className="min-h-11 rounded-xl border border-[var(--line)] px-4 text-sm font-extrabold transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]">
                ส่งกลับให้แก้ไข
              </button>
            </form>
          </div>
        ) : null}

        {!hasAnyAction ? (
          <p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--muted)]">
            กิจกรรมนี้ยังไม่มีปุ่มดำเนินการสำหรับบทบาทหรือสถานะปัจจุบัน
          </p>
        ) : null}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <span className="text-xs font-bold text-[var(--muted)]">{label}</span>
      <span className="font-extrabold text-[var(--ink)]">{value}</span>
    </div>
  );
}

function ActivityMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "amber" | "green" | "purple";
}) {
  const toneClass = {
    blue: "from-blue-500 to-cyan-500",
    amber: "from-amber-400 to-orange-500",
    green: "from-emerald-500 to-teal-500",
    purple: "from-violet-500 to-fuchsia-500",
  }[tone];
  return (
    <div className={`rounded-3xl bg-gradient-to-br ${toneClass} p-5 text-white shadow-[var(--shadow)]`}>
      <p className="text-sm font-bold opacity-90">{label}</p>
      <p className="mt-2 text-4xl font-extrabold">{value}</p>
    </div>
  );
}

function StoreIssueActivityCard({
  issue,
  scope,
  sectionKey,
}: {
  issue: StoreIssueActivity;
  scope: ActivityScope;
  sectionKey: StoreSectionKey;
}) {
  const statusLabel: Record<string, string> = {
    [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รอ Engineer อนุมัติ",
    [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอ Store จ่าย",
    [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
    [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับให้แก้ไข",
    [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่พอ",
  };
  const isEngineerQueue = sectionKey === "approve";
  const isStoreQueue = sectionKey === "issue";
  const isRequesterFollowUp = sectionKey === "follow-up";

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--primary)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-lg font-extrabold">{issue.number}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {issue.requesterName} · {formatThaiDateTime(issue.requestedAt)}
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-bold">
          {statusLabel[issue.status] ?? issue.status}
        </span>
      </div>
      <p className="mt-2 text-sm">
        {issue.items.map((item) => `${item.sparePart.code} ${item.sparePart.name}`).join(", ")}
      </p>

      {isEngineerQueue ? (
        <div className="mt-4 grid gap-3">
        <form action={engineerDecisionFromActivity} className="grid gap-2 rounded-xl bg-[var(--surface)] p-3 sm:grid-cols-[1fr_repeat(3,auto)] sm:items-end">
          <AdminScopeHiddenFields scope={scope} />
          <input name="issueId" type="hidden" value={issue.id} />
          <label className="grid gap-1 text-xs font-bold text-[var(--muted)]">
            Reason for return/reject
            <input className={activityInputClass} name="reason" />
          </label>
          <button className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700" name="decision" value="APPROVE">
            อนุมัติจาก My Activities
          </button>
          <button className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]" name="decision" value="RETURN">
            RETURN
          </button>
          <button className="rounded-xl border border-red-500/30 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-500/10" name="decision" value="REJECT">
            REJECT
          </button>
        </form>
        <StoreIssueCancelForm issueId={issue.id} scope={scope} />
        </div>
      ) : null}

      {isStoreQueue ? (
        <div className="mt-4 grid gap-3 rounded-xl bg-[var(--surface)] p-3 lg:grid-cols-[1fr_260px]">
          <form action={issueStockFromActivity} className="grid gap-2">
            <AdminScopeHiddenFields scope={scope} />
            <input name="issueId" type="hidden" value={issue.id} />
            {issue.items.map((item) => {
              const remaining = remainingIssueQty(item);
              return (
                <label className="grid gap-1 text-xs font-bold text-[var(--muted)] sm:grid-cols-[1fr_140px] sm:items-center" key={item.id}>
                  <span>{item.sparePart.code} {item.sparePart.name}</span>
                  <span className="grid gap-1">
                    จำนวนที่จะจ่ายครั้งนี้ (แก้ไขได้)
                    <input className={activityInputClass} defaultValue={remaining} inputMode="numeric" max={remaining} min="1" name="issueQty" step="1" type="number" />
                  </span>
                  <input name="itemId" type="hidden" value={item.id} />
                </label>
              );
            })}
            <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]">
              จ่าย Stock
            </button>
          </form>
          <form action={notEnoughStockFromActivity} className="grid content-end gap-2">
            <AdminScopeHiddenFields scope={scope} />
            <input name="issueId" type="hidden" value={issue.id} />
            <label className="grid gap-1 text-xs font-bold text-[var(--muted)]">
              Reason
              <input className={activityInputClass} name="reason" required />
            </label>
            <button className="min-h-11 rounded-xl border border-red-500/30 px-4 text-sm font-bold text-red-600 transition hover:bg-red-500/10">
              Not enough stock
            </button>
          </form>
          {issue.items.every((item) => Number(item.issuedQty ?? 0) === 0) ? (
            <div className="lg:col-span-2">
              <StoreIssueCancelForm issueId={issue.id} scope={scope} />
            </div>
          ) : null}
        </div>
      ) : null}

      {isRequesterFollowUp ? (
        <p className="mt-4 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-600">
          ใบเบิกนี้ต้องตรวจสอบและส่งคำขอใหม่จากรายการในหน้านี้
        </p>
      ) : null}
    </article>
  );
}

function StoreIssueCancelForm({ issueId, scope }: { issueId: string; scope: ActivityScope }) {
  return (
    <form action={cancelStoreIssueFromActivity} className="grid gap-2 rounded-xl border border-red-500/25 bg-red-500/5 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <AdminScopeHiddenFields scope={scope} />
      <input name="issueId" type="hidden" value={issueId} />
      <label className="grid gap-1 text-xs font-bold text-[var(--muted)]">
        เหตุผลการยกเลิก
        <input className={activityInputClass} name="reason" required />
      </label>
      <button className="min-h-11 rounded-xl border border-red-500/30 px-4 text-sm font-bold text-red-600 transition hover:bg-red-500/10">
        ยกเลิกใบเบิก
      </button>
    </form>
  );
}

function SectionTitle({
  icon,
  title,
  count,
}: {
  icon: ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <span className="text-[var(--primary)]">{icon}</span>
        {title}
      </h2>
      <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-bold text-[var(--muted)]">
        {count} งาน
      </span>
    </div>
  );
}

function ActivityCard({
  work,
  highlight = false,
}: {
  work: {
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
    createdAt: Date;
    claimant: { fullName: string } | null;
  };
  highlight?: boolean;
}) {
  return (
    <Link
      className="group grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-[var(--shadow)]"
      href={`/work/${work.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold">{work.number}</p>
          <p className="mt-1 font-semibold">{work.problemTitle}</p>
        </div>
        <StatusBadge status={work.status} />
      </div>
      <p className="text-sm text-[var(--muted)]">
        {work.category.name} · {work.zone.name} · {work.machineName}
      </p>
      <p className="text-sm text-[var(--muted)]">
        ผู้รับงาน: {work.claimant?.fullName ?? "-"} · เริ่มนับจาก{" "}
        {formatThaiDateTime(work.inProgressAt ?? work.claimedAt ?? work.createdAt)}
      </p>
      {highlight ? (
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
          <AlertCircle size={15} /> ควรอัปเดตความคืบหน้า
        </p>
      ) : null}
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-center text-sm font-semibold text-[var(--muted)]">
      {text}
    </div>
  );
}

function needsProgressUpdate(work: {
  status: string;
  claimedAt: Date | null;
  inProgressAt: Date | null;
  createdAt: Date;
}) {
  if (work.status !== WorkStatus.CLAIMED && work.status !== WorkStatus.IN_PROGRESS) return false;
  const anchor = work.inProgressAt ?? work.claimedAt ?? work.createdAt;
  return Date.now() - anchor.getTime() >= 24 * 60 * 60 * 1000;
}

function buildStoreSections({
  approvalIssues,
  issueQueueIssues,
  requesterFollowUpIssues,
}: {
  approvalIssues: StoreIssueActivity[];
  issueQueueIssues: StoreIssueActivity[];
  requesterFollowUpIssues: StoreIssueActivity[];
}) {
  return [
    {
      key: "approve" as const,
      title: "รอ Engineer อนุมัติ",
      issues: approvalIssues,
      emptyText: "ยังไม่มีใบเบิกที่รอ Engineer อนุมัติ",
    },
    {
      key: "issue" as const,
      title: "รอ Store จ่าย",
      issues: issueQueueIssues,
      emptyText: "ยังไม่มีใบเบิกที่รอ Store จ่าย",
    },
    {
      key: "follow-up" as const,
      title: "ส่งกลับให้แก้ไข / ของไม่พอ",
      issues: requesterFollowUpIssues,
      emptyText: "ยังไม่มีใบเบิกที่ถูกส่งกลับหรือแจ้งว่าอะไหล่ไม่พอ",
    },
  ].filter((section) => section.issues.length > 0);
}

function remainingIssueQty(item: StoreIssueActivity["items"][number]) {
  const approved = Number(item.approvedQty ?? item.requestedQty);
  const issued = Number(item.issuedQty ?? 0);
  const remaining = approved - issued;
  return Number.isFinite(remaining) && remaining > 0 ? remaining : 0;
}

function resolveActivityBoardFilters(query: PageQuery): ActivityBoardFilter {
  const typeValues: ActivityBoardFilter["type"][] = ["all", "cm", "store", "review"];
  const type = typeValues.includes(query.activityType as ActivityBoardFilter["type"])
    ? (query.activityType as ActivityBoardFilter["type"])
    : "all";
  const page = Math.max(1, Number(query.activityPage ?? 1) || 1);
  return {
    page,
    search: String(query.activitySearch ?? "").trim(),
    sort: query.activitySort === "oldest" ? "oldest" : "latest",
    status: String(query.activityStatus ?? "all"),
    type,
  };
}

function filterActivityBoardItems(items: ActivityFeedItem[], filters: ActivityBoardFilter) {
  const search = filters.search.toLowerCase();
  return items
    .filter((item) => filters.type === "all" || activityBoardType(item) === filters.type)
    .filter((item) => filters.status === "all" || item.status === filters.status)
    .filter((item) => {
      if (!search) return true;
      const haystack = [item.title, item.subtitle, item.kind === "work" ? item.work.machineName : item.issue.requesterName]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) =>
      filters.sort === "oldest"
        ? a.occurredAt.getTime() - b.occurredAt.getTime()
        : b.occurredAt.getTime() - a.occurredAt.getTime(),
    );
}

function activityBoardType(item: ActivityFeedItem): ActivityBoardItemType {
  if (item.kind === "store") return "store";
  if (item.status === WorkStatus.WAITING_TO_CLOSE) return "review";
  return "cm";
}

function activityStatusLabel(status: string) {
  const labelMap: Record<string, string> = {
    [WorkStatus.NEW]: "งานใหม่",
    [WorkStatus.WAITING_TO_CLAIM]: "รอรับงาน",
    [WorkStatus.CLAIMED]: "รับงานแล้ว",
    [WorkStatus.IN_PROGRESS]: "กำลังดำเนินการ",
    [WorkStatus.WAITING_TO_CLOSE]: "รอตรวจรับ",
    [WorkStatus.RETURNED_FOR_CORRECTION]: "ส่งกลับให้แก้ไข",
    [WorkStatus.CLOSED]: "ปิดงานแล้ว",
    [WorkStatus.CANCELED]: "ยกเลิก",
    [WorkStatus.BACKLOG_SHUTDOWN]: "Backlog",
    [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รออนุมัติ",
    [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอจ่าย",
    [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
    [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับ",
    [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่พอ",
  };
  return labelMap[status] ?? status;
}

function activityStatusPillClass(status: string, type: ActivityBoardItemType) {
  if (type === "store") return "border-violet-400/35 bg-violet-500/15 text-violet-500";
  if (status === WorkStatus.WAITING_TO_CLOSE) return "border-emerald-400/35 bg-emerald-500/15 text-emerald-500";
  if (status === WorkStatus.NEW) return "border-blue-400/35 bg-blue-500/15 text-blue-500";
  if (status === WorkStatus.IN_PROGRESS || status === WorkStatus.CLAIMED) {
    return "border-cyan-400/35 bg-cyan-500/15 text-cyan-500";
  }
  return "border-amber-400/35 bg-amber-500/15 text-amber-500";
}

function storeScopeFromActivity(scope: ActivityScope) {
  return {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    plantCode: scope.plant.code,
  };
}

async function activityActionContext(formData: FormData) {
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const actor: Actor = {
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    id: user.id,
    plantId: scope.plant.id,
    role: user.role as Actor["role"],
    siteAdminPermissions: user.siteAdminPermissions,
  };
  return { actor, scope };
}

function activityBoardRedirect(scope: ActivityScope, filters: ActivityBoardFilter) {
  return activityRedirect(scope, {
    activityPage: String(filters.page),
    activitySearch: filters.search,
    activitySort: filters.sort,
    activityStatus: filters.status,
    activityType: filters.type,
    activityView: "visual",
  });
}

function activitySelectionHref(
  scope: ActivityScope,
  filters: ActivityBoardFilter | undefined,
  selectedActivity: string,
  activityView: ActivityView = "visual",
) {
  if (!filters || activityView === "current") {
    return activityRedirect(scope, {
      activityView,
      selectedActivity,
    });
  }

  return activityRedirect(scope, {
    activityPage: String(filters.page),
    activitySearch: filters.search,
    activitySort: filters.sort,
    activityStatus: filters.status,
    activityType: filters.type,
    activityView,
    selectedActivity,
  });
}

function activityCloseHref(scope: ActivityScope, filters: ActivityBoardFilter, activityView: ActivityView) {
  if (activityView === "current") {
    return activityRedirect(scope, { activityView });
  }

  return activityBoardRedirect(scope, filters);
}

function activityRedirect(scope: ActivityScope, result: Record<string, string>) {
  const params = new URLSearchParams({
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    ...result,
  });
  return `/activities?${params}`;
}

function optionalActivityText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function activityActionError(error: unknown) {
  if (!(error instanceof Error)) return "Please try again.";
  const expected = [
    "required",
    "invalid",
    "not found",
    "outside",
    "exceeds",
    "Not enough stock",
    "cannot be canceled",
    "cannot cancel",
    "Only Engineer",
    "must be",
    "greater than zero",
  ];
  return expected.some((text) => error.message.includes(text)) ? error.message : "Please check the data and try again.";
}

const activityInputClass =
  "min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const activityTextareaClass =
  "min-h-24 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
