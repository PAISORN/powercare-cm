import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { PreserveListPositionForm } from "../../../components/preserve-list-position";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { IssueTrackingQuery } from "../../../modules/store/issue-tracking-query";

export function IssueTrackingFilterPanel({
  activeFilterCount,
  query,
  scope,
  storageKey,
}: {
  activeFilterCount: number;
  query: IssueTrackingQuery;
  scope: AdminSiteScope;
  storageKey: string;
}) {
  return (
    <section
      aria-label="ตัวกรอง Stock Issue"
      className="relative z-20 justify-self-end xl:mb-1"
    >
      <details className="group xl:static" data-testid="issue-filter-bar" open>
        <summary className="ml-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal aria-hidden="true" size={17} />
          ตัวกรอง · {issueKindLabel(query.itemKind)}
          {activeFilterCount ? (
            <span className="grid size-6 place-items-center rounded-full bg-white/20 text-[11px]">
              {activeFilterCount}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className="transition-transform duration-200 group-open:rotate-180"
            size={16}
          />
        </summary>
        <div className="mt-4 w-[calc(100vw-2rem)] pt-4 sm:w-[min(900px,calc(100vw-2rem))] xl:absolute xl:right-0 xl:top-full xl:z-50 xl:w-[min(1500px,calc(100vw-var(--app-sidebar-width,18rem)-4rem))]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white/80">Issue Filters</p>
              <h2 className="mt-1 text-xl font-semibold">ค้นหาและกรองใบเบิก</h2>
            </div>
            <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm text-[var(--muted)]">
              Site: {scope.plant.name}
            </span>
          </div>

          <PreserveListPositionForm
            action="/dashboardstore/issue"
            className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto_auto] xl:items-end"
            storageKey={storageKey}
            targetId="issue-tracking-scroll-position"
          >
            <AdminScopeHiddenFields scope={scope} />
            <input name="view" type="hidden" value="tracking" />
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Search</span>
              <span className="flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3">
                <Search className="text-[var(--muted)]" size={16} />
                <input
                  className="min-w-0 flex-1 bg-transparent py-3 text-[var(--ink)] outline-none"
                  defaultValue={query.search}
                  name="q"
                  placeholder="เลขใบเบิก, CM, ผู้ขอ หรือรายการ"
                />
              </span>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">ชนิดรายการ</span>
              <select
                className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] outline-none"
                defaultValue={query.itemKind}
                name="itemKind"
              >
                <option value="SPARE_PART">อะไหล่</option>
                <option value="CHEMICAL">สารเคมี</option>
                <option value="OIL">น้ำมัน</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-[var(--muted)]">Status</span>
              <select
                className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] outline-none"
                defaultValue={query.status}
                name="status"
              >
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="WAITING">รออนุมัติ</option>
                <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                <option value="COMPLETED">เสร็จสิ้น</option>
                <option value="CANCELED">ยกเลิก / ปฏิเสธ</option>
              </select>
            </label>
            <button
              className="min-h-12 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white"
              type="submit"
            >
              ใช้ตัวกรอง
            </button>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--line)] px-5 text-center font-semibold text-[var(--ink)]"
              href={`/dashboardstore/issue?organizationId=${scope.organization.id}&plantId=${scope.plant.id}&view=tracking`}
              scroll={false}
            >
              ล้างตัวกรอง
            </Link>
          </PreserveListPositionForm>
        </div>
      </details>
    </section>
  );
}

function issueKindLabel(value: string) {
  if (value === "CHEMICAL") return "สารเคมี";
  if (value === "OIL") return "น้ำมัน";
  return "อะไหล่";
}
