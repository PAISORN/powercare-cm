import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { markStatusReadAction } from "../../app/work/actions";
import type { WorkListPageData } from "../../modules/cm-work/work-list-page-data";
import { buildStatusFilterHref, IN_PROCESS_GROUP } from "../../modules/cm-work/work-list-query";
import { FilterBar } from "../filter-bar";
import { RestoreListPosition } from "../preserve-list-position";
import { StatusKpiStrip } from "../status-kpi-strip";
import { WorkEditDrawer } from "./work-edit-drawer";
import { WorkResults } from "./work-results";

export function WorkListWorkspace(data: WorkListPageData) {
  return (
    <>
      <RestoreListPosition enabled={!data.editWork} storageKey={data.workListPositionKey} />
      <section className="menu-heading-plain all-work-heading cm-hero relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[var(--shadow)]">
        <div className="plant-skyline" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <div className="relative z-10 grid items-end gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">CM Work List</p>
            <div className="mt-5 flex items-center gap-4">
              <span aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-white backdrop-blur sm:h-[72px] sm:w-[72px]"><ClipboardList size={42} strokeWidth={1.8} /></span>
              <div className="min-w-0">
                <h1 className="text-3xl font-extrabold sm:text-4xl">รายการงานทั้งหมด</h1>
                <p className="mt-2 text-white/80">ค้นหาและกรองงานตามสถานะ หมวด โซน ความเร่งด่วน ช่วงวันที่ และผู้รับงาน</p>
              </div>
            </div>
          </div>
          <section aria-label="ตัวกรอง All Work" className="relative z-20 justify-self-end xl:mb-1">
            <FilterBar values={data.filters} categories={data.categories} zones={data.zones} claimants={data.claimants.map((user) => ({ id: user.id, name: user.fullName }))} initiallyUnset={!data.hasExplicitDateFilter} placement="hero" />
          </section>
        </div>
      </section>
      <StatusKpiStrip statusCountByKey={data.statusCountByKey} activeStatus={data.filters.status} getHref={(status) => buildStatusFilterHref(data.filters, status)} unreadCountByStatus={data.unreadSummary.byStatus} readAction={markStatusReadAction} />
      {data.filters.statusGroup === IN_PROCESS_GROUP ? (
        <section className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow)]">
          <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-semibold">In Process</span>
          <span className="text-sm text-[var(--muted)]">รอรับงาน + รับเรื่องแล้ว + กำลังดำเนินการ + รอปิดงาน + ส่งกลับให้แก้ไข</span>
          <Link className="ml-auto rounded-full border border-[var(--line)] px-3 py-1 text-sm font-semibold" href="/work">Clear filters</Link>
        </section>
      ) : null}
      <WorkResults {...data} />
      <WorkEditDrawer {...data} />
    </>
  );
}
