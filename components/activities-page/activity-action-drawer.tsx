import Link from "next/link";
import { Clock3, X } from "lucide-react";
import { AdminScopeHiddenFields } from "../admin-site-scope-selector";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { canCloseWork } from "../../modules/auth/permission";
import { WorkStatus, type Actor } from "../../modules/cm-work/cm-work-types";
import {
  activityBoardType,
  activityStatusLabel,
  activityStatusPillClass,
} from "../../modules/activities/activity-page-model";
import type {
  ActivityFeedItem,
  ActivityScope,
  ActivityWork,
  StoreIssueActivity,
  StoreSectionKey,
} from "../../modules/activities/activity-types";
import { StoreIssueStatus } from "../../modules/store/store-types";
import {
  cancelStoreIssueFromActivity,
  closeWorkFromActivity,
  engineerDecisionFromActivity,
  issueStockFromActivity,
  notEnoughStockFromActivity,
  returnWorkFromActivity,
  startWorkFromActivity,
  submitWorkReviewFromActivity,
} from "../../app/activities/actions";
import { ActivityEmptyState } from "./activity-primitives";
export function ActivityActionDrawer({
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
      <Link
        aria-label="Close action panel"
        className="absolute inset-0"
        href={closeHref}
      />
      <aside
        className="activity-action-drawer relative ml-auto h-full w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface-raised)] p-4 shadow-[var(--shadow-raised)] animate-in slide-in-from-right duration-300 sm:p-5"
        id="activity-action-drawer"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
              Action Panel
            </p>
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
            <ActivityEmptyState text="เลือกกิจกรรมด้านซ้ายเพื่อเปิดรายการทำงาน" />
          </div>
        ) : item.kind === "store" ? (
          <div className="mt-4 grid gap-4">
            <ActivityDrawerSummary item={item} />
            <StoreIssueActivityCard
              issue={item.issue}
              scope={scope}
              sectionKey={item.sectionKey}
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            <ActivityDrawerSummary item={item} />
            <WorkActivityPanel
              actor={actor}
              work={item.work}
              highlight={item.highlight}
              scope={scope}
            />
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
          <p className="truncate font-mono text-sm font-bold text-[var(--muted)]">
            {item.title}
          </p>
          <h4 className="mt-1 text-lg font-extrabold">
            {item.kind === "work"
              ? item.work.problemTitle
              : (item.issue.items[0]?.sparePart.name ?? item.title)}
          </h4>
        </div>
        <span
          className={`rounded-xl border px-3 py-1 text-xs font-extrabold ${activityStatusPillClass(item.status, type)}`}
        >
          {type === "store" ? "Store" : activityStatusLabel(item.status)}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-[var(--muted)]">
        {item.subtitle}
      </p>
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
  work: ActivityWork;
  highlight?: boolean;
  scope: ActivityScope;
}) {
  const isClaimant = work.claimantId === actor.id;
  const canStart =
    isClaimant &&
    (work.status === WorkStatus.CLAIMED ||
      work.status === WorkStatus.BACKLOG_SHUTDOWN);
  const canSubmitForReview =
    isClaimant &&
    (work.status === WorkStatus.IN_PROGRESS ||
      work.status === WorkStatus.RETURNED_FOR_CORRECTION);
  const canReview = canCloseWork(actor, work);
  const hasAnyAction = canStart || canSubmitForReview || canReview;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
      <div className="grid gap-3 text-sm">
        <InfoLine label="เครื่องจักร" value={work.machineName} />
        <InfoLine
          label="Category / Zone"
          value={`${work.category.name} / ${work.zone.name}`}
        />
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
          <form
            action={submitWorkReviewFromActivity}
            className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3"
          >
            <AdminScopeHiddenFields scope={scope} />
            <input name="cmWorkId" type="hidden" value={work.id} />
            <label className="grid gap-1 text-xs font-bold text-[var(--muted)]">
              สาเหตุ
              <textarea
                className={activityTextareaClass}
                name="rootCause"
                required
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-[var(--muted)]">
              วิธีการแก้ไข
              <textarea
                className={activityTextareaClass}
                name="correctiveAction"
                required
              />
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
              <textarea
                className={activityTextareaClass}
                name="engineerNote"
                placeholder="หมายเหตุวิศวกร"
              />
              <button className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700">
                ปิดงาน
              </button>
            </form>
            <form action={returnWorkFromActivity} className="grid gap-2">
              <AdminScopeHiddenFields scope={scope} />
              <input name="cmWorkId" type="hidden" value={work.id} />
              <input
                className={activityInputClass}
                name="reason"
                placeholder="เหตุผลส่งกลับให้แก้ไข"
                required
              />
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

export function StoreIssueActivityCard({
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
        {issue.items
          .map((item) => `${item.sparePart.code} ${item.sparePart.name}`)
          .join(", ")}
      </p>

      {isEngineerQueue ? (
        <div className="mt-4 grid gap-3">
          <form
            action={engineerDecisionFromActivity}
            className="grid gap-2 rounded-xl bg-[var(--surface)] p-3 sm:grid-cols-[1fr_repeat(3,auto)] sm:items-end"
          >
            <AdminScopeHiddenFields scope={scope} />
            <input name="issueId" type="hidden" value={issue.id} />
            <label className="grid gap-1 text-xs font-bold text-[var(--muted)]">
              Reason for return/reject
              <input className={activityInputClass} name="reason" />
            </label>
            <button
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              name="decision"
              value="APPROVE"
            >
              อนุมัติจาก My Activities
            </button>
            <button
              className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              name="decision"
              value="RETURN"
            >
              RETURN
            </button>
            <button
              className="rounded-xl border border-red-500/30 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-500/10"
              name="decision"
              value="REJECT"
            >
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
            <p className="text-sm font-bold">
              จ่ายอะไหล่ครบทั้งใบเบิก {issue.items.length} รายการ
            </p>
            <p className="text-xs text-[var(--muted)]">
              ระบบจะตรวจสต็อกทุกรายการก่อนบันทึก และไม่จ่ายแยกทีละรายการ
            </p>
            <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]">
              จ่ายอะไหล่ทั้งใบ
            </button>
          </form>
          <form
            action={notEnoughStockFromActivity}
            className="grid content-end gap-2"
          >
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

function StoreIssueCancelForm({
  issueId,
  scope,
}: {
  issueId: string;
  scope: ActivityScope;
}) {
  return (
    <form
      action={cancelStoreIssueFromActivity}
      className="grid gap-2 rounded-xl border border-red-500/25 bg-red-500/5 p-3 sm:grid-cols-[1fr_auto] sm:items-end"
    >
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

const activityInputClass =
  "min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const activityTextareaClass =
  "min-h-24 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
