import {
  ClipboardList,
  Clock3,
  PackageCheck,
  Settings2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { paginationWindow } from "../../../lib/pagination-window";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { IssuePageData } from "../../../modules/store/issue-page-data";
import {
  buildIssueTrackingInspectHref,
  buildIssueTrackingPageHref,
  buildIssueTrackingStatusHref,
  type IssueTrackingQuery,
  type IssueTrackingStatus,
} from "../../../modules/store/issue-tracking-query";
import {
  IssueTrackingRow,
  type IssueRowPermissions,
  type IssueRowViewer,
} from "./issue-tracking-row";

export function IssueTrackingResults({
  currentPage,
  filteredIssueCount,
  issues,
  permissions,
  query,
  scope,
  statusCounts,
  storageKey,
  totalPages,
  viewer,
}: {
  currentPage: number;
  filteredIssueCount: number;
  issues: IssuePageData["pagedFilteredIssues"];
  permissions: IssueRowPermissions;
  query: IssueTrackingQuery;
  scope: AdminSiteScope;
  statusCounts: IssuePageData["statusCounts"];
  storageKey: string;
  totalPages: number;
  viewer: IssueRowViewer;
}) {
  const trackingScope = {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  };
  const pageHref = (page: number) =>
    buildIssueTrackingPageHref(trackingScope, query, page);
  const statusHref = (status: IssueTrackingStatus) =>
    buildIssueTrackingStatusHref(trackingScope, query, status);
  const inspectHref = (inspectIssueId?: string) =>
    buildIssueTrackingInspectHref(trackingScope, query, inspectIssueId);
  const closeHref = inspectHref();

  return (
    <>
      <section
        aria-label="Issue status KPI strip"
        className="dashboard-kpi-carousel mt-6 sm:grid-cols-3 lg:grid-cols-5"
        id="issue-tracking"
      >
        <TrackingStat
          active={query.status === "ALL"}
          href={statusHref("ALL")}
          icon={<ClipboardList size={20} />}
          label="ทั้งหมด"
          value={statusCounts.all}
        />
        <TrackingStat
          active={query.status === "WAITING"}
          href={statusHref("WAITING")}
          icon={<Clock3 size={20} />}
          label="รออนุมัติ"
          tone="amber"
          value={statusCounts.waiting}
        />
        <TrackingStat
          active={query.status === "IN_PROGRESS"}
          href={statusHref("IN_PROGRESS")}
          icon={<Settings2 size={20} />}
          label="ดำเนินการ"
          tone="blue"
          value={statusCounts.inProgress}
        />
        <TrackingStat
          active={query.status === "COMPLETED"}
          href={statusHref("COMPLETED")}
          icon={<PackageCheck size={20} />}
          label="เสร็จสิ้น"
          tone="green"
          value={statusCounts.completed}
        />
        <TrackingStat
          active={query.status === "CANCELED"}
          href={statusHref("CANCELED")}
          icon={<XCircle size={20} />}
          label="ยกเลิก"
          tone="red"
          value={statusCounts.canceled}
        />
      </section>

      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Issue Results</h2>
          <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm text-[var(--muted)]">
            {filteredIssueCount} items · Page {currentPage}/{totalPages}
          </span>
        </div>
        <div className="mt-4 grid gap-4">
          {issues.length ? (
            issues.map((issue) => (
              <IssueTrackingRow
                closeHref={closeHref}
                inspected={query.inspectIssueId === issue.id}
                issue={issue}
                key={issue.id}
                openHref={inspectHref(issue.id)}
                permissions={permissions}
                returnTo={`${closeHref}#issue-row-${issue.id}`}
                scope={scope}
                storageKey={storageKey}
                viewer={viewer}
              />
            ))
          ) : (
            <p className="p-6 text-center text-[var(--muted)]">
              ไม่พบใบเบิกตามเงื่อนไขที่เลือก
            </p>
          )}
        </div>

        {totalPages > 1 ? (
          <nav
            aria-label="Issue tracking pagination"
            className="mt-5 flex flex-wrap items-center justify-end gap-2"
          >
            <Link
              aria-disabled={currentPage === 1}
              className={trackingPaginationArrowClass(currentPage === 1)}
              href={pageHref(Math.max(1, currentPage - 1))}
              scroll={false}
            >
              ก่อนหน้า
            </Link>
            {paginationWindow(currentPage, totalPages).map((pageNumber) => (
              <Link
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={trackingPaginationPageClass(
                  pageNumber === currentPage,
                )}
                href={pageHref(pageNumber)}
                key={pageNumber}
                scroll={false}
              >
                {pageNumber}
              </Link>
            ))}
            <Link
              aria-disabled={currentPage === totalPages}
              className={trackingPaginationArrowClass(
                currentPage === totalPages,
              )}
              href={pageHref(Math.min(totalPages, currentPage + 1))}
              scroll={false}
            >
              ถัดไป
            </Link>
          </nav>
        ) : null}
      </section>
    </>
  );
}

function TrackingStat({
  active,
  href,
  icon,
  label,
  tone = "neutral",
  value,
}: {
  active: boolean;
  href: string;
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "amber" | "blue" | "green" | "red";
  value: number;
}) {
  const colors = {
    neutral: "#8b5cf6",
    amber: "#f59e0b",
    blue: "#06b6d4",
    green: "#22c55e",
    red: "#ef4444",
  };
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`dashboard-kpi dashboard-kpi-glow dashboard-kpi-slide relative block min-h-[148px] overflow-hidden rounded-2xl border p-4 text-left transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${active ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]" : ""}`}
      href={href}
      scroll={false}
      style={{ "--kpi-color": colors[tone] } as React.CSSProperties}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="min-w-0 text-sm font-semibold leading-5">{label}</p>
          <strong className="mt-3 block text-3xl leading-none tracking-tight">
            {value}
          </strong>
        </div>
        <span className="dashboard-kpi-icon shrink-0">{icon}</span>
      </div>
    </Link>
  );
}

function trackingPaginationPageClass(isActive: boolean) {
  return isActive
    ? "rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm"
    : "rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-[var(--soft)]";
}

function trackingPaginationArrowClass(isDisabled: boolean) {
  return isDisabled
    ? "pointer-events-none rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] opacity-50"
    : "rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-[var(--soft)]";
}
