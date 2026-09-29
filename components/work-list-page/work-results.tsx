import Link from "next/link";
import {
  claimFromListAction,
  openWorkAction,
} from "../../app/work/actions";
import { canClaimWork } from "../../modules/auth/permission";
import type { WorkListPageData } from "../../modules/cm-work/work-list-page-data";
import {
  buildPageHref,
  buildWorkEditHref,
  getStatusDate,
  workPageWindow,
  type WorkSearchParams,
} from "../../modules/cm-work/work-list-query";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { PreserveListPositionLink } from "../preserve-list-position";
import { StatusBadge } from "../status-badge";
import { UserAvatar } from "../user-avatar";

type WorkResultsProps = Pick<
  WorkListPageData,
  | "actor"
  | "canEditWorkRequest"
  | "currentPage"
  | "filters"
  | "returnTo"
  | "total"
  | "totalPages"
  | "unreadWorkIds"
  | "workListPositionKey"
  | "works"
>;

export function WorkResults(props: WorkResultsProps) {
  const {
    actor,
    canEditWorkRequest,
    currentPage,
    filters,
    returnTo,
    total,
    totalPages,
    unreadWorkIds,
    workListPositionKey,
    works,
  } = props;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Work Results</h2>
        <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm text-[var(--muted)]">
          {total} items · Page {currentPage}/{totalPages}
        </span>
      </div>
      <div className="mt-4 grid gap-4">
        {works.length ? (
          works.map((work) => (
            <article
              className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4 transition duration-300 ease-out hover:bg-[var(--surface)] md:grid-cols-[1fr_auto]"
              id={`work-row-${work.id}`}
              key={work.id}
            >
              <form action={openWorkAction} className="min-w-0">
                <input name="workId" type="hidden" value={work.id} />
                <button
                  className="relative block w-full min-w-0 rounded-xl text-left transition duration-300 ease-out hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                  type="submit"
                >
                  {unreadWorkIds.has(work.id) ? (
                    <span
                      aria-label="Unread work update"
                      className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600 shadow-sm ring-2 ring-[var(--surface)]"
                    />
                  ) : null}
                  <strong className="block text-lg">{work.number}</strong>
                  <span className="mt-1 block text-sm font-semibold text-[var(--ink)]">
                    Category: {work.category.name} · Zone: {work.zone.name}
                  </span>
                  <span className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)]">
                    {work.claimant ? (
                      <UserAvatar
                        fullName={work.claimant.fullName}
                        hasPhoto={Boolean(work.claimant.profilePhoto)}
                        size="sm"
                        userId={work.claimant.id}
                        version={work.claimant.profilePhoto?.updatedAt.getTime()}
                      />
                    ) : null}
                    <span>
                      Date: {formatThaiDateTime(getStatusDate(work))} · Assignee:{" "}
                      {work.claimant?.fullName ?? "-"} · Work: {work.problemTitle}
                    </span>
                  </span>
                  <span className="hidden">
                    {work.machineName} · {work.category.name} · {work.zone.name} ·
                    ผู้รับงาน: {work.claimant?.fullName ?? "-"}
                  </span>
                </button>
              </form>
              <span
                className="flex flex-wrap items-start justify-start gap-2 md:justify-end"
                data-reveal-section
              >
                <StatusBadge status={work.status} />
                {canClaimWork(actor, work) ? (
                  <form action={claimFromListAction}>
                    <input name="workId" type="hidden" value={work.id} />
                    <input name="returnTo" type="hidden" value={returnTo} />
                    <button
                      className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                      type="submit"
                    >
                      รับงาน
                    </button>
                  </form>
                ) : null}
                {canEditWorkRequest ? (
                  <PreserveListPositionLink
                    className="rounded-full border border-[var(--line)] px-4 py-1.5 text-xs font-bold text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40"
                    href={buildWorkEditHref(filters, work.id)}
                    storageKey={workListPositionKey}
                    targetId={`work-row-${work.id}`}
                  >
                    แก้ไข
                  </PreserveListPositionLink>
                ) : null}
              </span>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-6 text-center text-[var(--muted)]">
            ไม่พบรายการงานตามเงื่อนไขที่เลือก
          </p>
        )}
      </div>
      {totalPages > 1 ? (
        <WorkPagination
          currentPage={currentPage}
          filters={filters}
          totalPages={totalPages}
        />
      ) : null}
    </section>
  );
}

function WorkPagination({
  filters,
  currentPage,
  totalPages,
}: {
  filters: WorkSearchParams;
  currentPage: number;
  totalPages: number;
}) {
  return (
    <nav
      aria-label="Work results pagination"
      className="mt-5 flex flex-wrap items-center justify-end gap-2"
    >
      <PageLink
        currentPage={currentPage}
        disabled={currentPage === 1}
        filters={filters}
        label="ก่อนหน้า"
        page={Math.max(1, currentPage - 1)}
      />
      {workPageWindow(currentPage, totalPages).map((page) => (
        <PageLink
          active={page === currentPage}
          currentPage={currentPage}
          filters={filters}
          key={page}
          label={String(page)}
          page={page}
        />
      ))}
      <PageLink
        currentPage={currentPage}
        disabled={currentPage === totalPages}
        filters={filters}
        label="ถัดไป"
        page={Math.min(totalPages, currentPage + 1)}
      />
    </nav>
  );
}

function PageLink({
  filters,
  page,
  label,
  active = false,
  disabled = false,
}: {
  filters: WorkSearchParams;
  page: number;
  label: string;
  currentPage: number;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = active
    ? "rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm"
    : disabled
      ? "pointer-events-none rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--muted)] opacity-50"
      : "rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold hover:bg-[var(--soft)]";
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={className}
      href={disabled ? "#" : buildPageHref(filters, page)}
    >
      {label}
    </Link>
  );
}
