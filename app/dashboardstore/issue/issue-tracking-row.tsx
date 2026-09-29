import {
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  PackageX,
  Printer,
  RotateCcw,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  PreserveListPositionForm,
  PreserveListPositionLink,
} from "../../../components/preserve-list-position";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import type { IssuePageData } from "../../../modules/store/issue-page-data";
import { issueTrackingStatusGroup } from "../../../modules/store/issue-tracking-query";
import { canPrintSparePartIssueDocument } from "../../../modules/store/store-issue-print-permission";
import { StoreIssueStatus } from "../../../modules/store/store-types";
import {
  cancelIssueAction,
  engineerDecisionAction,
  issueStockAction,
  notEnoughStockAction,
} from "./actions";
import { IssueActionHiddenFields } from "./issue-action-hidden-fields";

type IssueRow = IssuePageData["pagedFilteredIssues"][number];

export type IssueRowViewer = {
  id: string;
  role: string;
  organizationId?: string | null;
  plantId?: string | null;
};

export type IssueRowPermissions = {
  canApprove: boolean;
  canIssue: boolean;
  approvalKinds: string[];
  responsibilityKinds: string[];
};

export function IssueTrackingRow({
  closeHref,
  inspected,
  issue,
  openHref,
  permissions,
  returnTo,
  scope,
  storageKey,
  viewer,
}: {
  closeHref: string;
  inspected: boolean;
  issue: IssueRow;
  openHref: string;
  permissions: IssueRowPermissions;
  returnTo: string;
  scope: AdminSiteScope;
  storageKey: string;
  viewer: IssueRowViewer;
}) {
  const itemSummary = issue.items
    .map((item) => `${item.sparePart.code} ${item.sparePart.name}`)
    .join(", ");
  const rowId = `issue-row-${issue.id}`;
  const canApproveIssue =
    permissions.canApprove &&
    permissions.approvalKinds.includes(issue.itemKind) &&
    issue.requesterUserId !== viewer.id &&
    issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL;
  const canIssueRequest =
    permissions.canIssue &&
    permissions.responsibilityKinds.includes(issue.itemKind) &&
    issue.requesterUserId !== viewer.id &&
    issue.engineerId !== viewer.id &&
    [
      StoreIssueStatus.WAITING_STORE_ISSUE,
      StoreIssueStatus.PARTIALLY_ISSUED,
    ].includes(issue.status as never);

  return (
    <article
      className="issue-row-two-line rounded-2xl border border-[var(--line)] bg-[var(--soft)] transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-[var(--surface)] hover:shadow-[var(--shadow)]"
      id={rowId}
    >
      <div className="hidden h-1 bg-[var(--primary)]" />
      <div className="p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate font-mono text-lg font-black tracking-tight text-[var(--ink)] sm:text-xl">
                {issue.number}
              </p>
              <StoreIssueStatusBadge status={issue.status} />
            </div>
            <p className="mt-1 truncate text-sm text-[var(--muted)]">
              {issue.cmWork?.number
                ? `CM: ${issue.cmWork.number}`
                : "Direct issue"}{" "}
              · {issue.requesterUser?.fullName ?? issue.requesterName} ·{" "}
              {formatThaiMediumDateTime(issue.requestedAt)}
            </p>
            <p className="mt-2 line-clamp-2 text-sm font-semibold sm:text-base">
              {issue.note ?? itemSummary ?? "-"}
            </p>
            <p className="mt-2 truncate text-xs font-bold text-[var(--muted)]">
              {issueKindLabel(issue.itemKind)} {issue.items.length} รายการ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {canPrintSparePartIssueDocument(viewer, issue) ? (
              <Link
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 text-xs font-bold text-[var(--ink)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href={`/dashboardstore/issue/${issue.id}/print`}
                rel="noreferrer"
                target="_blank"
              >
                <Printer size={15} />
                พิมพ์เอกสาร
              </Link>
            ) : null}
            <PreserveListPositionLink
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--primary)] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]"
              href={openHref}
              storageKey={storageKey}
              targetId={rowId}
            >
              ตรวจสอบใบเบิก
            </PreserveListPositionLink>
          </div>
          {inspected ? (
            <>
              <PreserveListPositionLink
                aria-label="ปิดรายละเอียดใบเบิก"
                className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm"
                href={closeHref}
                storageKey={storageKey}
                targetId={rowId}
              />
              <aside
                aria-labelledby={`issue-drawer-title-${issue.id}`}
                className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7"
              >
                <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--primary)]">
                      ตรวจสอบใบเบิก
                    </p>
                    <h2
                      className="mt-1 truncate font-mono text-2xl font-extrabold"
                      id={`issue-drawer-title-${issue.id}`}
                    >
                      {issue.number}
                    </h2>
                    <div className="mt-2">
                      <StoreIssueStatusBadge status={issue.status} />
                    </div>
                  </div>
                  <PreserveListPositionLink
                    className="rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-bold"
                    href={closeHref}
                    storageKey={storageKey}
                    targetId={rowId}
                  >
                    ปิด
                  </PreserveListPositionLink>
                </div>
                <div className="mt-5 grid gap-3">
                  <IssueProgress issue={issue} />
                  {issue.items.map((item) => {
                    const approved = Number(
                      item.approvedQty ?? item.requestedQty,
                    );
                    const issued = Number(item.issuedQty ?? 0);
                    return (
                      <div
                        className="grid gap-1 rounded-xl bg-[var(--surface)] p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center"
                        key={item.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold">
                            {item.sparePart.code} · {item.sparePart.name}
                          </p>
                          {item.lineNumber ? (
                            <p className="truncate font-mono text-[11px] text-[var(--primary)]">
                              {item.lineNumber}
                            </p>
                          ) : null}
                          <p className="text-xs text-[var(--muted)]">
                            {item.store?.code ?? "-"} · Request{" "}
                            {formatQty(Number(item.requestedQty))}{" "}
                            {item.sparePart.unit}
                          </p>
                        </div>
                        <p className="font-bold">
                          Issued {formatQty(issued)} / {formatQty(approved)}
                        </p>
                      </div>
                    );
                  })}

                  {canApproveIssue ? (
                    <PreserveListPositionForm
                      action={engineerDecisionAction}
                      className="grid gap-2 rounded-xl bg-[var(--surface)] p-3 sm:grid-cols-[1fr_repeat(3,auto)] sm:items-end"
                      storageKey={storageKey}
                      targetId={rowId}
                    >
                      <IssueActionHiddenFields
                        issueId={issue.id}
                        returnTo={returnTo}
                        scope={scope}
                      />
                      <label className="grid gap-1 text-sm font-bold">
                        Reason
                        <input className={inputClass} name="reason" />
                      </label>
                      <DecisionButton
                        decision="APPROVE"
                        icon={<CheckCircle2 size={16} />}
                        label="Approve"
                      />
                      <DecisionButton
                        decision="RETURN"
                        icon={<RotateCcw size={16} />}
                        label="Return"
                      />
                      <DecisionButton
                        decision="REJECT"
                        icon={<XCircle size={16} />}
                        label="Reject"
                      />
                    </PreserveListPositionForm>
                  ) : null}

                  {canIssueRequest ? (
                    <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
                      <PreserveListPositionForm
                        action={issueStockAction}
                        className="grid gap-2 rounded-xl bg-[var(--surface)] p-3"
                        storageKey={storageKey}
                        targetId={rowId}
                      >
                        <IssueActionHiddenFields
                          issueId={issue.id}
                          returnTo={returnTo}
                          scope={scope}
                        />
                        <p className="text-sm font-bold">
                          จ่ายอะไหล่ครบทั้งใบเบิก {issue.items.length} รายการ
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          ระบบจะตรวจสต็อกทุกรายการก่อน
                          และจะไม่หักสต็อกหากมีรายการใดไม่เพียงพอ
                        </p>
                        <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]">
                          จ่ายอะไหล่ทั้งใบ
                        </button>
                      </PreserveListPositionForm>
                      <PreserveListPositionForm
                        action={notEnoughStockAction}
                        className="grid content-end gap-2 rounded-xl bg-[var(--surface)] p-3"
                        storageKey={storageKey}
                        targetId={rowId}
                      >
                        <IssueActionHiddenFields
                          issueId={issue.id}
                          returnTo={returnTo}
                          scope={scope}
                        />
                        <label className="grid gap-1 text-sm font-bold">
                          Not enough reason
                          <input
                            className={inputClass}
                            name="reason"
                            required
                          />
                        </label>
                        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 font-bold text-red-600 transition hover:bg-red-500/10">
                          <PackageX size={17} />
                          Not enough stock
                        </button>
                      </PreserveListPositionForm>
                    </div>
                  ) : null}

                  {canCancelIssue(viewer.role, issue.status, issue.items) ? (
                    <PreserveListPositionForm
                      action={cancelIssueAction}
                      className="grid gap-2 rounded-xl border border-red-500/25 bg-red-500/5 p-3 sm:grid-cols-[1fr_auto] sm:items-end"
                      storageKey={storageKey}
                      targetId={rowId}
                    >
                      <IssueActionHiddenFields
                        issueId={issue.id}
                        returnTo={returnTo}
                        scope={scope}
                      />
                      <label className="grid gap-1 text-sm font-bold">
                        เหตุผลการยกเลิก
                        <input className={inputClass} name="reason" required />
                      </label>
                      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/35 px-4 font-bold text-red-600 transition hover:bg-red-500/10">
                        <XCircle size={17} /> ยกเลิกใบเบิก
                      </button>
                    </PreserveListPositionForm>
                  ) : null}

                  {issue.rejectReason ? (
                    <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                      Reason: {issue.rejectReason}
                    </p>
                  ) : null}
                  {issue.engineer || issue.storeOfficer ? (
                    <p className="text-xs text-[var(--muted)]">
                      Engineer: {issue.engineer?.fullName ?? "-"} · Store
                      Officer: {issue.storeOfficer?.fullName ?? "-"}
                    </p>
                  ) : null}
                </div>
              </aside>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function IssueProgress({ issue }: { issue: IssueRow }) {
  const engineerState =
    issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL
      ? "active"
      : [
            StoreIssueStatus.ENGINEER_REJECTED,
            StoreIssueStatus.RETURNED_FOR_EDIT,
          ].includes(issue.status as never)
        ? "error"
        : "done";
  const storeState = [
    StoreIssueStatus.WAITING_STORE_ISSUE,
    StoreIssueStatus.PARTIALLY_ISSUED,
  ].includes(issue.status as never)
    ? "active"
    : [
          StoreIssueStatus.NOT_ENOUGH_STOCK,
          StoreIssueStatus.STORE_REJECTED,
        ].includes(issue.status as never)
      ? "error"
      : issue.status === StoreIssueStatus.ISSUED
        ? "done"
        : "pending";
  const finalState =
    issue.status === StoreIssueStatus.ISSUED
      ? "done"
      : [
            StoreIssueStatus.CANCELED,
            StoreIssueStatus.ENGINEER_REJECTED,
            StoreIssueStatus.STORE_REJECTED,
            StoreIssueStatus.NOT_ENOUGH_STOCK,
          ].includes(issue.status as never)
        ? "error"
        : "pending";
  const stages = [
    {
      label: "ส่งคำขอ",
      state: "done",
      time: issue.requestedAt,
      icon: <ClipboardList size={16} />,
    },
    {
      label: "Engineer อนุมัติ",
      state: engineerState,
      time: issue.engineerApprovedAt,
      icon: <CheckCircle2 size={16} />,
    },
    {
      label: "Store จ่ายอะไหล่",
      state: storeState,
      time: issue.issuedAt,
      icon: <ShoppingCart size={16} />,
    },
    {
      label: finalState === "error" ? "ยกเลิก / ปฏิเสธ" : "เสร็จสิ้น",
      state: finalState,
      time: finalState === "error" ? issue.rejectedAt : issue.issuedAt,
      icon:
        finalState === "error" ? (
          <XCircle size={16} />
        ) : (
          <PackageCheck size={16} />
        ),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 sm:grid-cols-4">
      {stages.map((stage) => (
        <div className="min-w-0" key={stage.label}>
          <div
            className={`flex size-8 items-center justify-center rounded-full ${progressTone(stage.state)}`}
          >
            {stage.icon}
          </div>
          <p className="mt-2 truncate text-xs font-extrabold">{stage.label}</p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">
            {stage.time
              ? formatThaiMediumDateTime(stage.time)
              : progressLabel(stage.state)}
          </p>
        </div>
      ))}
    </div>
  );
}

function canCancelIssue(
  role: string,
  status: string,
  items: Array<{ issuedQty: unknown | null }>,
) {
  if (items.some((item) => Number(item.issuedQty ?? 0) > 0)) return false;
  if (role === RoleName.ENGINEER) {
    return [
      StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
      StoreIssueStatus.RETURNED_FOR_EDIT,
      StoreIssueStatus.WAITING_STORE_ISSUE,
      StoreIssueStatus.NOT_ENOUGH_STOCK,
    ].includes(status as never);
  }
  if (role === RoleName.STORE_OFFICER) {
    return [
      StoreIssueStatus.WAITING_STORE_ISSUE,
      StoreIssueStatus.NOT_ENOUGH_STOCK,
    ].includes(status as never);
  }
  return (
    role === RoleName.ADMIN &&
    [
      StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
      StoreIssueStatus.RETURNED_FOR_EDIT,
      StoreIssueStatus.WAITING_STORE_ISSUE,
      StoreIssueStatus.NOT_ENOUGH_STOCK,
    ].includes(status as never)
  );
}

function DecisionButton({
  decision,
  icon,
  label,
}: {
  decision: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
      name="decision"
      value={decision}
    >
      {icon}
      {label}
    </button>
  );
}

function StoreIssueStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รอ Engineer อนุมัติ",
    [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับแก้ไข",
    [StoreIssueStatus.ENGINEER_REJECTED]: "Engineer Reject",
    [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอ Store จ่าย",
    [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
    [StoreIssueStatus.ISSUED]: "จ่ายครบแล้ว",
    [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่พอ",
    [StoreIssueStatus.STORE_REJECTED]: "Store Reject",
    [StoreIssueStatus.CANCELED]: "ยกเลิก",
  };
  const tone =
    issueTrackingStatusGroup(status) === "WAITING"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : issueTrackingStatusGroup(status) === "IN_PROGRESS"
        ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
        : issueTrackingStatusGroup(status) === "COMPLETED"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "bg-red-500/15 text-red-700 dark:text-red-300";
  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${tone}`}>
      {labels[status] ?? status}
    </span>
  );
}

function issueKindLabel(value: string) {
  if (value === "CHEMICAL") return "สารเคมี";
  if (value === "OIL") return "น้ำมัน";
  return "อะไหล่";
}

function progressTone(state: string) {
  if (state === "done") return "bg-emerald-500 text-white";
  if (state === "active") return "bg-amber-500 text-white";
  if (state === "error") return "bg-red-500 text-white";
  return "bg-[var(--soft)] text-[var(--muted)]";
}

function progressLabel(state: string) {
  if (state === "active") return "กำลังรอดำเนินการ";
  if (state === "error") return "ไม่สำเร็จ";
  return "ยังไม่ถึงขั้นตอนนี้";
}

function formatQty(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
