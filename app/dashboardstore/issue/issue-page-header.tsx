import { ClipboardList, ShoppingCart } from "lucide-react";
import Link from "next/link";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { IssueTrackingQuery } from "../../../modules/store/issue-tracking-query";
import { IssueTrackingFilterPanel } from "./issue-tracking-filter-panel";

export function IssuePageHeader({
  activeFilterCount,
  query,
  scope,
  showCreateLink,
  showTrackingLink,
  storageKey,
  trackingOnly,
}: {
  activeFilterCount: number;
  query: IssueTrackingQuery;
  scope: AdminSiteScope;
  showCreateLink: boolean;
  showTrackingLink: boolean;
  storageKey: string;
  trackingOnly: boolean;
}) {
  return (
    <section className="menu-heading-plain all-work-heading stock-issue-heading cm-hero relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[var(--shadow)]">
      <div className="plant-skyline" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="relative z-10 grid items-end gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
            Store Issue
          </p>
          <div className="mt-5 flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur sm:h-[72px] sm:w-[72px]"
            >
              <ClipboardList size={42} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold sm:text-4xl">
                {trackingOnly ? "ติดตามสถานะใบเบิก" : "สร้างใบเบิก"}
              </h1>
              <p className="mt-2 text-white/80">
                {trackingOnly
                  ? "ค้นหา กรอง ตรวจสอบสถานะ และพิมพ์เอกสารใบเบิกย้อนหลัง"
                  : "สร้างใบเบิกอะไหล่ สารเคมี หรือน้ำมันสำหรับงาน CM และการเบิกโดยตรง"}
              </p>
            </div>
          </div>
          <nav
            aria-label="Stock Issue views"
            className="mt-5 flex flex-wrap gap-2"
          >
            {showCreateLink ? (
              <Link
                aria-current={!trackingOnly ? "page" : undefined}
                className={issueViewLinkClass(!trackingOnly)}
                href={`/dashboardstore/issue?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`}
                scroll={false}
              >
                <ShoppingCart size={17} /> สร้างใบเบิก
              </Link>
            ) : null}
            {showTrackingLink ? (
              <Link
                aria-current={trackingOnly ? "page" : undefined}
                className={issueViewLinkClass(trackingOnly)}
                href={`/dashboardstore/issue?organizationId=${scope.organization.id}&plantId=${scope.plant.id}&view=tracking&itemKind=${query.itemKind}`}
                scroll={false}
              >
                <ClipboardList size={17} /> ติดตามใบเบิก
              </Link>
            ) : null}
          </nav>
        </div>

        {trackingOnly ? (
          <IssueTrackingFilterPanel
            activeFilterCount={activeFilterCount}
            query={query}
            scope={scope}
            storageKey={storageKey}
          />
        ) : null}
      </div>
    </section>
  );
}

function issueViewLinkClass(active: boolean) {
  return active
    ? "inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--primary)] shadow-sm"
    : "inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20";
}
