import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  AlertCircle,
  Boxes,
  ClipboardCheck,
  Clock3,
  Wrench,
} from "lucide-react";
import { AdminSiteScopeSelector } from "../admin-site-scope-selector";
import { StatusBadge } from "../status-badge";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import {
  activityCloseHref,
  needsProgressUpdate,
} from "../../modules/activities/activity-page-model";
import type {
  ActivityPageData,
  ActivityPageQuery,
  ActivityScope,
  ActivityWork,
} from "../../modules/activities/activity-types";
import {
  ActivityActionDrawer,
  StoreIssueActivityCard,
} from "./activity-action-drawer";
import {
  ActivityBoardView,
  ActivityViewToggle,
  UnifiedActivityList,
} from "./activity-board";
import { ActivityEmptyState } from "./activity-primitives";
export function ActivitiesWorkspace({
  data,
  query,
  scope,
}: {
  data: ActivityPageData;
  query: ActivityPageQuery;
  scope: ActivityScope;
}) {
  const {
    actor,
    activityView,
    activityBoardFilters,
    combinedActivities,
    filteredBoardActivities,
    selectedItem,
    ownedWorks,
    reviewWorks,
    storeSections,
    totalActivities,
    totalStoreActivities,
  } = data;
  return (
    <>
      <div className="page-enter">
        <header className="menu-heading-plain activities-page-hero relative overflow-hidden rounded-3xl border p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm font-bold text-white">
                <ClipboardCheck size={16} /> My Activities
              </p>
              <h1 className="mt-3 text-3xl font-bold text-white">
                งานที่ต้องดำเนินการ
              </h1>
              <p className="mt-1 max-w-3xl text-white/75">
                รวมงานที่รับผิดชอบ งานที่ต้องอัปเดต งานรอตรวจรับ/ปิดงาน
                และคิวงาน Store
              </p>
            </div>
            <div
              className="dashboard-kpi dashboard-kpi-glow relative min-w-40 overflow-hidden rounded-2xl border px-5 py-4 text-right"
              style={{ "--kpi-color": "#3b82f6" } as CSSProperties}
            >
              <p className="text-sm font-semibold text-white/70">
                Total Activities
              </p>
              <p className="text-3xl font-extrabold text-white">
                {totalActivities}
              </p>
            </div>
          </div>
        </header>

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
          <p
            className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300"
            role="alert"
          >
            ดำเนินการ Store ไม่สำเร็จ: {query.storeError}
          </p>
        ) : null}

        <section className="ops-panel page-outer-shell reveal-on-scroll mt-6 rounded-3xl border border-[var(--line)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle
              icon={<Clock3 size={18} />}
              title="กิจกรรมทั้งหมด"
              count={combinedActivities.length}
            />
            <ActivityViewToggle activeView={activityView} scope={scope} />
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
              <UnifiedActivityList
                items={combinedActivities}
                scope={scope}
                selectedKey={selectedItem?.key}
              />
            )}
          </div>
        </section>

        {selectedItem ? (
          <ActivityActionDrawer
            actor={actor}
            closeHref={activityCloseHref(
              scope,
              activityBoardFilters,
              activityView,
            )}
            item={selectedItem}
            scope={scope}
          />
        ) : null}

        <section className="hidden reveal-on-scroll mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <SectionTitle
            icon={<Clock3 size={18} />}
            title="งานที่รับผิดชอบอยู่"
            count={ownedWorks.length}
          />
          <div className="mt-4 grid gap-3">
            {ownedWorks.length ? (
              ownedWorks.map((work) => (
                <ActivityCard
                  key={work.id}
                  work={work}
                  highlight={needsProgressUpdate(work)}
                />
              ))
            ) : (
              <ActivityEmptyState text="ยังไม่มีงานที่รับผิดชอบอยู่" />
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
                    <h3 className="text-base font-extrabold text-[var(--ink)]">
                      {storeSection.title}
                    </h3>
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
                      <ActivityEmptyState text={storeSection.emptyText} />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <ActivityEmptyState text="ยังไม่มีกิจกรรม Store ที่ต้องดำเนินการ" />
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
              reviewWorks.map((work) => (
                <ActivityCard key={work.id} work={work} />
              ))
            ) : (
              <ActivityEmptyState text="ยังไม่มีงานรอตรวจรับ/ปิดงาน" />
            )}
          </div>
        </section>
      </div>
    </>
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
        {formatThaiDateTime(
          work.inProgressAt ?? work.claimedAt ?? work.createdAt,
        )}
      </p>
      {highlight ? (
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
          <AlertCircle size={15} /> ควรอัปเดตความคืบหน้า
        </p>
      ) : null}
    </Link>
  );
}
