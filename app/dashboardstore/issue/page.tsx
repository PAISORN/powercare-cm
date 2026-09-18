import {
  Beaker,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Package,
  PackageCheck,
  PackageX,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  ShoppingCart,
  Droplets,
  XCircle,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { PreserveListPositionForm, PreserveListPositionLink, RestoreListPosition } from "../../../components/preserve-list-position";
import { IssueRequestForm } from "../../../components/store/issue-request-form";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { paginationWindow } from "../../../lib/pagination-window";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import {
  approveStoreIssue,
  cancelStoreIssue,
  createLoggedInStoreIssue,
  issueStoreStock,
  markIssueNotEnoughStock,
} from "../../../modules/store/store-issue-prisma";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import { canPrintSparePartIssueDocument } from "../../../modules/store/store-issue-print-permission";
import { StoreIssueStatus } from "../../../modules/store/store-types";

type PageQuery = {
  organizationId?: string;
  plantId?: string;
  created?: string;
  saved?: string;
  error?: string;
  q?: string;
  status?: string;
  trackingPage?: string;
  itemKind?: string;
  inspectIssueId?: string;
  view?: string;
};

async function createIssueAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const plant = await db.plant.findUniqueOrThrow({ where: { id: scope.plant.id }, select: { inventoryCode: true } });
  const stockKeys = formData.getAll("stockKey").map(String);
  const zoneIds = formData.getAll("zoneId").map(String);
  const quantities = formData.getAll("requestedQty").map(Number);
  const items = stockKeys.map((stockKey, index) => {
    const [storeId, sparePartId] = stockKey.split(":");
    return { storeId, sparePartId, zoneId: zoneIds[index], requestedQty: quantities[index] };
  });

  let createdNumber: string | null = null;
  let actionError: string | null = null;
  try {
    const created = await createLoggedInStoreIssue(
      user,
      {
        organizationId: scope.organization.id,
        plantId: scope.plant.id,
        plantCode: plant.inventoryCode ?? "",
      },
      {
        issueType: String(formData.get("issueType") ?? ""),
        cmWorkNumber: optionalText(formData.get("cmWorkNumber")),
        requesterName: user.fullName,
        vehicle: optionalText(formData.get("vehicle")),
        odometerBefore: optionalNumber(formData.get("odometerBefore")),
        odometerAfter: optionalNumber(formData.get("odometerAfter")),
        dispenserMeterBefore: optionalNumber(formData.get("dispenserMeterBefore")),
        dispenserMeterAfter: optionalNumber(formData.get("dispenserMeterAfter")),
        note: optionalText(formData.get("note")),
        requestedAt: new Date(),
        submissionKey: optionalText(formData.get("submissionKey")),
        items,
      },
    );
    createdNumber = created.number;
  } catch (error) {
    actionError = storeActionError(error);
  }
  redirect(issueRedirect(scope, createdNumber ? { created: createdNumber } : { error: actionError ?? "Unknown error" }));
}

async function engineerDecisionAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const issueId = String(formData.get("issueId") ?? "");
  const decision = String(formData.get("decision") ?? "") as "APPROVE" | "REJECT" | "RETURN";
  let actionError: string | null = null;
  try {
    await approveStoreIssue(user, storeScope(scope), issueId, decision, optionalText(formData.get("reason")));
  } catch (error) {
    actionError = storeActionError(error);
  }
  redirect(issueRedirect(scope, actionError ? { view: "tracking", error: actionError } : { view: "tracking", saved: "decision" }));
}

async function issueStockAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  let actionError: string | null = null;
  try {
    await issueStoreStock(
      user,
      storeScope(scope),
      String(formData.get("issueId") ?? ""),
    );
  } catch (error) {
    actionError = storeActionError(error);
  }
  redirect(issueRedirect(scope, actionError ? { view: "tracking", error: actionError } : { view: "tracking", saved: "issued" }));
}

async function notEnoughStockAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  let actionError: string | null = null;
  try {
    await markIssueNotEnoughStock(
      user,
      storeScope(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    actionError = storeActionError(error);
  }
  redirect(issueRedirect(scope, actionError ? { view: "tracking", error: actionError } : { view: "tracking", saved: "not-enough" }));
}

async function cancelIssueAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  let actionError: string | null = null;
  try {
    await cancelStoreIssue(
      user,
      storeScope(scope),
      String(formData.get("issueId") ?? ""),
      String(formData.get("reason") ?? ""),
    );
  } catch (error) {
    actionError = storeActionError(error);
  }
  redirect(issueRedirect(scope, actionError ? { view: "tracking", error: actionError } : { view: "tracking", saved: "canceled" }));
}

export default async function IssuePage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  const canCreate = canUseUserPermission(user, PermissionKey.CREATE_STORE_ISSUE);
  const canApprove = canUseUserPermission(user, PermissionKey.APPROVE_STORE_ISSUE);
  const canIssue = canUseUserPermission(user, PermissionKey.ISSUE_STOCK);
  const canTrack = canUseUserPermission(user, PermissionKey.VIEW_STORE_TRACKING);
  const approvalKinds = new Set(user.role === RoleName.ADMIN ? ["SPARE_PART", "CHEMICAL", "OIL"] : user.inventoryScopes.filter((scope) => scope.approvalEnabled).map((scope) => scope.itemKind));
  const responsibilityKinds = new Set(user.role === RoleName.ADMIN ? ["SPARE_PART", "CHEMICAL", "OIL"] : user.inventoryScopes.filter((scope) => scope.responsibilityEnabled).map((scope) => scope.itemKind));
  const query = await searchParams;
  const trackingOnly = query.view === "tracking";
  if (trackingOnly && !canTrack && !canApprove && !canIssue) redirect("/dashboardcm");
  if (!trackingOnly && !canCreate) redirect("/dashboardstore/issue?view=tracking");
  const scope = await resolveStorePageScope(user, query);

  const selectedTrackingStatus = normalizeTrackingStatus(query.status);
  const selectedTrackingKind = resolveItemKind(query.itemKind);
  const trackingSearch = String(query.q ?? "").trim();
  const trackingPageSize = 5;
  const issueVisibilityWhere: Prisma.SparePartIssueWhereInput = {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    ...(!canApprove && !canIssue ? { requesterUserId: user.id } : {}),
  };
  const issueKindWhere: Prisma.SparePartIssueWhereInput = { ...issueVisibilityWhere, itemKind: selectedTrackingKind };
  const selectedStatuses = trackingStatusValues(selectedTrackingStatus);
  const filteredIssueWhere: Prisma.SparePartIssueWhereInput = {
    ...issueKindWhere,
    ...(selectedStatuses ? { status: { in: selectedStatuses } } : {}),
    ...(trackingSearch ? { OR: [
      { number: { contains: trackingSearch } },
      { requesterName: { contains: trackingSearch } },
      { cmWork: { is: { number: { contains: trackingSearch } } } },
      { requesterUser: { is: { fullName: { contains: trackingSearch } } } },
      { items: { some: { OR: [
        { lineNumber: { contains: trackingSearch } },
        { sparePart: { code: { contains: trackingSearch } } },
        { sparePart: { name: { contains: trackingSearch } } },
      ] } } },
    ] } : {}),
  };

  const [stocks, issueZones, cmWorks, issueStatusRows, filteredIssueCount] = await Promise.all([
    db.storeStock.findMany({
      where: { plantId: scope.plant.id, quantity: { gt: 0 }, store: { active: true }, sparePart: { active: true } },
      include: {
        store: { select: { id: true, code: true, name: true, category: { select: { name: true } } } },
        sparePart: { select: {
          id: true, code: true, itemCode: true, itemKind: true, name: true, unit: true, minStock: true,
          type: { select: { name: true } }, category: { select: { name: true } }, materialGroup: { select: { name: true } },
        } },
      },
      orderBy: [{ store: { name: "asc" } }, { sparePart: { name: "asc" } }],
    }),
    db.storeApplicableZone.findMany({
      where: { plantId: scope.plant.id, active: true, zone: { active: true } },
      select: { code: true, zone: { select: { id: true, name: true } } },
      orderBy: { code: "asc" },
    }),
    db.cmWork.findMany({
      where: { plantId: scope.plant.id, organizationId: scope.organization.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, number: true, problemTitle: true, machineName: true },
    }),
    db.sparePartIssue.findMany({ where: issueKindWhere, select: { status: true } }),
    db.sparePartIssue.count({ where: filteredIssueWhere }),
  ]);

  const statusCounts = {
    all: issueStatusRows.length,
    waiting: issueStatusRows.filter((issue) => issueStatusGroup(issue.status) === "WAITING").length,
    inProgress: issueStatusRows.filter((issue) => issueStatusGroup(issue.status) === "IN_PROGRESS").length,
    completed: issueStatusRows.filter((issue) => issueStatusGroup(issue.status) === "COMPLETED").length,
    canceled: issueStatusRows.filter((issue) => issueStatusGroup(issue.status) === "CANCELED").length,
  };
  const totalTrackingPages = Math.max(1, Math.ceil(filteredIssueCount / trackingPageSize));
  const requestedTrackingPage = Number.parseInt(query.trackingPage ?? "1", 10);
  const currentTrackingPage = Number.isFinite(requestedTrackingPage) && requestedTrackingPage > 0
    ? Math.min(requestedTrackingPage, totalTrackingPages)
    : 1;
  const pagedFilteredIssues = await db.sparePartIssue.findMany({
    where: filteredIssueWhere,
    include: {
      cmWork: { select: { number: true } },
      requesterUser: { select: { fullName: true } },
      engineer: { select: { fullName: true, signature: { select: { id: true } } } },
      storeOfficer: { select: { fullName: true, signature: { select: { id: true } } } },
      items: { include: {
        store: { select: { code: true, name: true } },
        sparePart: { select: { code: true, name: true, unit: true, itemKind: true } },
      }, orderBy: { id: "asc" } },
    },
    orderBy: { requestedAt: "desc" },
    skip: (currentTrackingPage - 1) * trackingPageSize,
    take: trackingPageSize,
  });
  const trackingListPositionKey = `store-issues:${scope.organization.id}:${scope.plant.id}`;
  const trackingPageHref = (page: number) => {
    const params = new URLSearchParams({
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      view: "tracking",
    });
    if (query.q) params.set("q", query.q);
    if (selectedTrackingStatus !== "ALL") params.set("status", selectedTrackingStatus);
    params.set("itemKind", selectedTrackingKind);
    if (page > 1) params.set("trackingPage", String(page));
    return `/dashboardstore/issue?${params.toString()}#issue-tracking`;
  };
  const trackingStatusHref = (status: "ALL" | "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED") => {
    const params = new URLSearchParams({
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      view: "tracking",
      itemKind: selectedTrackingKind,
    });
    if (query.q) params.set("q", query.q);
    if (status !== "ALL") params.set("status", status);
    return `/dashboardstore/issue?${params.toString()}#issue-tracking`;
  };
  const trackingInspectHref = (inspectIssueId?: string) => {
    const params = new URLSearchParams({
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      view: "tracking",
      itemKind: selectedTrackingKind,
    });
    if (query.q) params.set("q", query.q);
    if (selectedTrackingStatus !== "ALL") params.set("status", selectedTrackingStatus);
    if (currentTrackingPage > 1) params.set("trackingPage", String(currentTrackingPage));
    if (inspectIssueId) params.set("inspectIssueId", inspectIssueId);
    return `/dashboardstore/issue?${params.toString()}`;
  };

  function CompactIssueRow({ issue }: { issue: (typeof pagedFilteredIssues)[number] }) {
    const itemSummary = issue.items
      .map((item) => `${item.sparePart.code} ${item.sparePart.name}`)
      .join(", ");
    return (
      <article className="issue-row-two-line border-b border-[var(--line)] bg-[var(--surface)] transition duration-300 ease-out last:border-b-0 hover:bg-[var(--soft)]">
        <div className="hidden h-1 bg-[var(--primary)]" />
        <div className="p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate font-mono text-lg font-black tracking-tight text-[var(--ink)] sm:text-xl">{issue.number}</p>
              <StoreIssueStatusBadge status={issue.status} />
            </div>
            <p className="mt-1 truncate text-sm text-[var(--muted)]">
              {issue.cmWork?.number ? `CM: ${issue.cmWork.number}` : "Direct issue"} · {issue.requesterUser?.fullName ?? issue.requesterName} · {formatThaiMediumDateTime(issue.requestedAt)}
            </p>
            <p className="mt-2 line-clamp-2 text-sm font-semibold sm:text-base">{issue.note ?? itemSummary ?? "-"}</p>
            <p className="mt-2 truncate text-xs font-bold text-[var(--muted)]">{issueKindLabel(issue.itemKind)} {issue.items.length} รายการ</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {canPrintSparePartIssueDocument(user, issue) ? (
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
              href={trackingInspectHref(issue.id)}
              storageKey={trackingListPositionKey}
              targetId={`issue-row-${issue.id}`}
            >
              ตรวจสอบใบเบิก
            </PreserveListPositionLink>
          </div>
          {query.inspectIssueId === issue.id ? (
            <>
              <PreserveListPositionLink
                aria-label="ปิดรายละเอียดใบเบิก"
                className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm"
                href={trackingInspectHref()}
                storageKey={trackingListPositionKey}
                targetId={`issue-row-${issue.id}`}
              />
              <aside aria-labelledby={`issue-drawer-title-${issue.id}`} className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--primary)]">ตรวจสอบใบเบิก</p>
                    <h2 className="mt-1 truncate font-mono text-2xl font-extrabold" id={`issue-drawer-title-${issue.id}`}>{issue.number}</h2>
                    <div className="mt-2"><StoreIssueStatusBadge status={issue.status} /></div>
                  </div>
                  <PreserveListPositionLink
                    className="rounded-full bg-[var(--soft)] px-4 py-2 text-sm font-bold"
                    href={trackingInspectHref()}
                    storageKey={trackingListPositionKey}
                    targetId={`issue-row-${issue.id}`}
                  >
                    ปิด
                  </PreserveListPositionLink>
                </div>
                <div className="mt-5 grid gap-3">
              <IssueProgress issue={issue} />
              {issue.items.map((item) => {
                const approved = Number(item.approvedQty ?? item.requestedQty);
                const issued = Number(item.issuedQty ?? 0);
                return (
                  <div className="grid gap-1 rounded-xl bg-[var(--surface)] p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                    <div className="min-w-0">
                      <p className="truncate font-bold">{item.sparePart.code} · {item.sparePart.name}</p>
                      {item.lineNumber ? <p className="truncate font-mono text-[11px] text-[var(--primary)]">{item.lineNumber}</p> : null}
                      <p className="text-xs text-[var(--muted)]">{item.store?.code ?? "-"} · Request {formatQty(Number(item.requestedQty))} {item.sparePart.unit}</p>
                    </div>
                    <p className="font-bold">Issued {formatQty(issued)} / {formatQty(approved)}</p>
                  </div>
                );
              })}

              {canApprove && approvalKinds.has(issue.itemKind) && issue.requesterUserId !== user.id && issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL ? (
                <PreserveListPositionForm action={engineerDecisionAction} className="grid gap-2 rounded-xl bg-[var(--surface)] p-3 sm:grid-cols-[1fr_repeat(3,auto)] sm:items-end" storageKey={trackingListPositionKey} targetId={`issue-row-${issue.id}`}>
                  <AdminScopeHiddenFields scope={scope} />
                  <input name="issueId" type="hidden" value={issue.id} />
                  <label className="grid gap-1 text-sm font-bold">
                    Reason
                    <input className={inputClass} name="reason" />
                  </label>
                  <DecisionButton decision="APPROVE" icon={<CheckCircle2 size={16} />} label="Approve" />
                  <DecisionButton decision="RETURN" icon={<RotateCcw size={16} />} label="Return" />
                  <DecisionButton decision="REJECT" icon={<XCircle size={16} />} label="Reject" />
                </PreserveListPositionForm>
              ) : null}

              {canIssue && responsibilityKinds.has(issue.itemKind) && issue.requesterUserId !== user.id && issue.engineerId !== user.id && [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED].includes(issue.status as never) ? (
                <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
                  <PreserveListPositionForm action={issueStockAction} className="grid gap-2 rounded-xl bg-[var(--surface)] p-3" storageKey={trackingListPositionKey} targetId={`issue-row-${issue.id}`}>
                    <AdminScopeHiddenFields scope={scope} />
                    <input name="issueId" type="hidden" value={issue.id} />
                    <p className="text-sm font-bold">จ่ายอะไหล่ครบทั้งใบเบิก {issue.items.length} รายการ</p>
                    <p className="text-xs text-[var(--muted)]">ระบบจะตรวจสต็อกทุกรายการก่อน และจะไม่หักสต็อกหากมีรายการใดไม่เพียงพอ</p>
                    <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]">
                      จ่ายอะไหล่ทั้งใบ
                    </button>
                  </PreserveListPositionForm>
                  <PreserveListPositionForm action={notEnoughStockAction} className="grid content-end gap-2 rounded-xl bg-[var(--surface)] p-3" storageKey={trackingListPositionKey} targetId={`issue-row-${issue.id}`}>
                    <AdminScopeHiddenFields scope={scope} />
                    <input name="issueId" type="hidden" value={issue.id} />
                    <label className="grid gap-1 text-sm font-bold">
                      Not enough reason
                      <input className={inputClass} name="reason" required />
                    </label>
                    <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 font-bold text-red-600 transition hover:bg-red-500/10">
                      <PackageX size={17} />
                      Not enough stock
                    </button>
                  </PreserveListPositionForm>
                </div>
              ) : null}

              {canCancelIssue(user.role, issue.status, issue.items) ? (
                <PreserveListPositionForm action={cancelIssueAction} className="grid gap-2 rounded-xl border border-red-500/25 bg-red-500/5 p-3 sm:grid-cols-[1fr_auto] sm:items-end" storageKey={trackingListPositionKey} targetId={`issue-row-${issue.id}`}>
                  <AdminScopeHiddenFields scope={scope} />
                  <input name="issueId" type="hidden" value={issue.id} />
                  <label className="grid gap-1 text-sm font-bold">
                    เหตุผลการยกเลิก
                    <input className={inputClass} name="reason" required />
                  </label>
                  <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/35 px-4 font-bold text-red-600 transition hover:bg-red-500/10">
                    <XCircle size={17} /> ยกเลิกใบเบิก
                  </button>
                </PreserveListPositionForm>
              ) : null}

              {issue.rejectReason ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">Reason: {issue.rejectReason}</p> : null}
              {(issue.engineer || issue.storeOfficer) ? (
                <p className="text-xs text-[var(--muted)]">
                  Engineer: {issue.engineer?.fullName ?? "-"} · Store Officer: {issue.storeOfficer?.fullName ?? "-"}
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

  return (
    <AppShell>
      <RestoreListPosition
        enabled={trackingOnly}
        key={`${query.itemKind ?? ""}:${query.status ?? ""}:${query.q ?? ""}:${query.trackingPage ?? ""}:${query.inspectIssueId ?? ""}`}
        storageKey={trackingListPositionKey}
      />

      <section className="menu-heading-plain cm-hero relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-[var(--shadow)]">
        <div className="plant-skyline" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="relative z-10">
          <p className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">Store Issue</p>
          <h1 className="mt-5 text-4xl font-extrabold">{trackingOnly ? "ติดตามสถานะใบเบิก" : "สร้างใบเบิก"}</h1>
          <p className="mt-2 text-white/80">
            {trackingOnly
              ? "ค้นหา กรอง ตรวจสอบสถานะ และพิมพ์เอกสารใบเบิกย้อนหลัง"
              : "สร้างใบเบิกอะไหล่ สารเคมี หรือน้ำมันสำหรับงาน CM และการเบิกโดยตรง"}
          </p>
          <nav aria-label="Stock Issue views" className="mt-5 flex flex-wrap gap-2">
            {canCreate ? (
              <Link
                aria-current={!trackingOnly ? "page" : undefined}
                className={issueViewLinkClass(!trackingOnly)}
                href={`/dashboardstore/issue?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`}
                scroll={false}
              >
                <ShoppingCart size={17} /> สร้างใบเบิก
              </Link>
            ) : null}
            {(canTrack || canApprove || canIssue) ? (
              <Link
                aria-current={trackingOnly ? "page" : undefined}
                className={issueViewLinkClass(trackingOnly)}
                href={`/dashboardstore/issue?organizationId=${scope.organization.id}&plantId=${scope.plant.id}&view=tracking&itemKind=${selectedTrackingKind}`}
                scroll={false}
              >
                <ClipboardList size={17} /> ติดตามใบเบิก
              </Link>
            ) : null}
          </nav>
        </div>
      </section>

      {query.created ? (
        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">
          ส่งคำขอเบิกสำเร็จ เลขที่ใบเบิก: <span className="font-mono">{query.created}</span>
        </p>
      ) : null}
      {query.saved ? (
        <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">
          บันทึกการดำเนินการเรียบร้อยแล้ว
        </p>
      ) : null}
      {query.error ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-700 dark:text-red-300" role="alert">
          ดำเนินการไม่สำเร็จ: {query.error}
        </p>
      ) : null}

      {!trackingOnly ? (
        <section className="mt-6" data-testid="issue-create-workspace">
          {canCreate && !issueZones.length ? (
            <div className="mb-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-200">
              Site นี้ยังไม่มี Applicable Zone ที่เปิดใช้งาน จึงยังสร้างใบเบิกไม่ได้ กรุณากำหนดรหัส Zone ในหน้า Spare Parts ก่อน
            </div>
          ) : null}
          {canCreate ? (
            <IssueRequestForm
              action={createIssueAction}
              cmWorks={cmWorks.map((work) => ({
                id: work.id,
                number: work.number,
                label: `${work.machineName} · ${work.problemTitle}`,
              }))}
              hideHeader
              organizationId={scope.organization.id}
              plantId={scope.plant.id}
              initialItemKind={resolveItemKind(query.itemKind)}
              requesterSummary={{ name: user.fullName, department: user.category?.name }}
              siteSummary={{
                organizationName: scope.organization.name,
                plantName: scope.plant.name,
                inventoryCode: scope.plant.code,
              }}
              issueZones={issueZones.map((item) => ({ ...item.zone, code: item.code }))}
              stocks={stocks.map((stock) => ({
                storeId: stock.storeId,
                sparePartId: stock.sparePartId,
                sparePartItemKind: stock.sparePart.itemKind,
                label: `${stock.store.code} · ${stock.sparePart.code} · ${stock.sparePart.name}`,
                available: Number(stock.quantity),
                unit: stock.sparePart.unit,
                storeCode: stock.store.code,
                storeName: stock.store.name,
                storeCategoryName: stock.store.category?.name,
                sparePartCode: stock.sparePart.code,
                sparePartName: stock.sparePart.name,
                sparePartTypeName: stock.sparePart.type?.name,
                sparePartCategoryName: stock.sparePart.category?.name,
                sparePartMaterialGroupName: stock.sparePart.materialGroup?.name,
                itemCode: stock.sparePart.itemCode,
                stockStatus: buildStoreStockStatus(Number(stock.quantity), Number(stock.sparePart.minStock)),
              }))}
            />
          ) : null}
        </section>
      ) : null}

      {trackingOnly ? (
        <>
          <section className="relative z-20 mt-4 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" id="issue-tracking">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--primary)]">Issue Filters</p>
                <h2 className="mt-1 text-xl font-semibold">ค้นหาและกรองใบเบิก</h2>
              </div>
              <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm text-[var(--muted)]">
                Site: {scope.plant.name}
              </span>
            </div>

            <IssueTrackingTabs
              itemKind={selectedTrackingKind}
              organizationId={scope.organization.id}
              plantId={scope.plant.id}
              query={query.q}
              status={selectedTrackingStatus}
            />

            <PreserveListPositionForm action="/dashboardstore/issue" className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto] lg:items-end" storageKey={trackingListPositionKey} targetId="issue-tracking-scroll-position">
              <AdminScopeHiddenFields scope={scope} />
              <input name="view" type="hidden" value="tracking" />
              <input name="itemKind" type="hidden" value={selectedTrackingKind} />
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Search</span>
                <span className="flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3">
                  <Search className="text-[var(--muted)]" size={16} />
                  <input className="min-w-0 flex-1 bg-transparent py-3 outline-none" defaultValue={query.q ?? ""} name="q" placeholder="เลขใบเบิก, CM, ผู้ขอ หรือรายการ" />
                </span>
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[var(--muted)]">Status</span>
                <select className="min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 outline-none" defaultValue={selectedTrackingStatus} name="status">
                  <option value="ALL">สถานะทั้งหมด</option>
                  <option value="WAITING">รออนุมัติ</option>
                  <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                  <option value="COMPLETED">เสร็จสิ้น</option>
                  <option value="CANCELED">ยกเลิก / ปฏิเสธ</option>
                </select>
              </label>
              <button className="min-h-12 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white" type="submit">
                Filter
              </button>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--line)] px-5 text-center font-semibold"
                href={`/dashboardstore/issue?organizationId=${scope.organization.id}&plantId=${scope.plant.id}&view=tracking&itemKind=${selectedTrackingKind}`}
                scroll={false}
              >
                Clear filters
              </Link>
            </PreserveListPositionForm>
          </section>

          <section aria-label="Issue status KPI strip" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <TrackingStat active={selectedTrackingStatus === "ALL"} href={trackingStatusHref("ALL")} icon={<ClipboardList size={20} />} label="ทั้งหมด" value={statusCounts.all} />
            <TrackingStat active={selectedTrackingStatus === "WAITING"} href={trackingStatusHref("WAITING")} icon={<Clock3 size={20} />} label="รออนุมัติ" tone="amber" value={statusCounts.waiting} />
            <TrackingStat active={selectedTrackingStatus === "IN_PROGRESS"} href={trackingStatusHref("IN_PROGRESS")} icon={<Settings2 size={20} />} label="ดำเนินการ" tone="blue" value={statusCounts.inProgress} />
            <TrackingStat active={selectedTrackingStatus === "COMPLETED"} href={trackingStatusHref("COMPLETED")} icon={<PackageCheck size={20} />} label="เสร็จสิ้น" tone="green" value={statusCounts.completed} />
            <TrackingStat active={selectedTrackingStatus === "CANCELED"} href={trackingStatusHref("CANCELED")} icon={<XCircle size={20} />} label="ยกเลิก" tone="red" value={statusCounts.canceled} />
          </section>

          <section className="mt-6 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Issue Results</h2>
              <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm text-[var(--muted)]">
                {filteredIssueCount} items · Page {currentTrackingPage}/{totalTrackingPages}
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)]">
              {pagedFilteredIssues.length ? (
                pagedFilteredIssues.map((issue) => <CompactIssueRow issue={issue} key={issue.id} />)
              ) : (
                <p className="p-6 text-center text-[var(--muted)]">ไม่พบใบเบิกตามเงื่อนไขที่เลือก</p>
              )}
            </div>

            {totalTrackingPages > 1 ? (
              <nav aria-label="Issue tracking pagination" className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <Link
                  aria-disabled={currentTrackingPage === 1}
                  className={trackingPaginationArrowClass(currentTrackingPage === 1)}
                  href={trackingPageHref(Math.max(1, currentTrackingPage - 1))}
                  scroll={false}
                >
                  ก่อนหน้า
                </Link>
                {paginationWindow(currentTrackingPage, totalTrackingPages).map((pageNumber) => (
                  <Link
                    aria-current={pageNumber === currentTrackingPage ? "page" : undefined}
                    className={trackingPaginationPageClass(pageNumber === currentTrackingPage)}
                    href={trackingPageHref(pageNumber)}
                    key={pageNumber}
                    scroll={false}
                  >
                    {pageNumber}
                  </Link>
                ))}
                <Link
                  aria-disabled={currentTrackingPage === totalTrackingPages}
                  className={trackingPaginationArrowClass(currentTrackingPage === totalTrackingPages)}
                  href={trackingPageHref(Math.min(totalTrackingPages, currentTrackingPage + 1))}
                  scroll={false}
                >
                  ถัดไป
                </Link>
              </nav>
            ) : null}
          </section>
        </>
      ) : null}
    </AppShell>
  );
}

function IssueTrackingTabs({
  itemKind,
  organizationId,
  plantId,
  query,
  status,
}: {
  itemKind: "SPARE_PART" | "CHEMICAL" | "OIL";
  organizationId: string;
  plantId: string;
  query?: string;
  status: string;
}) {
  const tabs = [
    { key: "SPARE_PART" as const, label: "อะไหล่", icon: Package },
    { key: "CHEMICAL" as const, label: "สารเคมี", icon: Beaker },
    { key: "OIL" as const, label: "น้ำมัน", icon: Droplets },
  ];

  return (
    <nav aria-label="ประเภทใบเบิกที่ติดตาม" className="mt-4 border-b border-[var(--line)]" role="tablist">
      <div className="grid grid-cols-3">
        {tabs.map((tab) => {
          const active = tab.key === itemKind;
          const Icon = tab.icon;
          const params = new URLSearchParams({ organizationId, plantId, itemKind: tab.key, view: "tracking" });
          if (query) params.set("q", query);
          if (status !== "ALL") params.set("status", status);
          return (
            <Link
              aria-selected={active}
              className={`relative flex min-h-12 cursor-pointer items-center justify-center gap-2 px-2 py-3 text-sm font-extrabold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)] sm:px-4 sm:text-base ${
                active
                  ? "text-[var(--primary)] after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:rounded-t-full after:bg-[var(--primary)]"
                  : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"
              }`}
              href={`/dashboardstore/issue?${params.toString()}#issue-tracking`}
              key={tab.key}
              role="tab"
              scroll={false}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={2} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function resolveItemKind(value?: string): "SPARE_PART" | "CHEMICAL" | "OIL" {
  return value === "CHEMICAL" || value === "OIL" ? value : "SPARE_PART";
}

function issueKindLabel(value: string) {
  if (value === "CHEMICAL") return "สารเคมี";
  if (value === "OIL") return "น้ำมัน";
  return "อะไหล่";
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

function issueViewLinkClass(active: boolean) {
  return active
    ? "inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--primary)] shadow-sm"
    : "inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20";
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
  const surfaces = {
    neutral: "status-kpi-violet",
    amber: "status-kpi-amber",
    blue: "status-kpi-cyan",
    green: "status-kpi-green",
    red: "status-kpi-red",
  };
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`status-kpi-card relative block overflow-hidden rounded-2xl border p-4 text-left transition duration-300 ease-out hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 ${surfaces[tone]} ${active ? "status-kpi-active ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]" : ""}`}
      href={href}
      scroll={false}
    >
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="min-w-0 text-sm font-semibold leading-5">{label}</p>
          <strong className="mt-3 block text-3xl leading-none tracking-tight">{value}</strong>
        </div>
        <span className="status-kpi-icon shrink-0">{icon}</span>
      </div>
    </Link>
  );
}

function IssueProgress({
  issue,
}: {
  issue: {
    status: string;
    requestedAt: Date;
    engineerApprovedAt: Date | null;
    issuedAt: Date | null;
    rejectedAt: Date | null;
  };
}) {
  const engineerState = issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL
    ? "active"
    : [StoreIssueStatus.ENGINEER_REJECTED, StoreIssueStatus.RETURNED_FOR_EDIT].includes(issue.status as never)
      ? "error"
      : "done";
  const storeState = [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED].includes(issue.status as never)
    ? "active"
    : [StoreIssueStatus.NOT_ENOUGH_STOCK, StoreIssueStatus.STORE_REJECTED].includes(issue.status as never)
      ? "error"
      : issue.status === StoreIssueStatus.ISSUED
        ? "done"
        : "pending";
  const finalState = issue.status === StoreIssueStatus.ISSUED
    ? "done"
    : [StoreIssueStatus.CANCELED, StoreIssueStatus.ENGINEER_REJECTED, StoreIssueStatus.STORE_REJECTED, StoreIssueStatus.NOT_ENOUGH_STOCK].includes(issue.status as never)
      ? "error"
      : "pending";
  const stages = [
    { label: "ส่งคำขอ", state: "done", time: issue.requestedAt, icon: <ClipboardList size={16} /> },
    { label: "Engineer อนุมัติ", state: engineerState, time: issue.engineerApprovedAt, icon: <CheckCircle2 size={16} /> },
    { label: "Store จ่ายอะไหล่", state: storeState, time: issue.issuedAt, icon: <ShoppingCart size={16} /> },
    { label: finalState === "error" ? "ยกเลิก / ปฏิเสธ" : "เสร็จสิ้น", state: finalState, time: finalState === "error" ? issue.rejectedAt : issue.issuedAt, icon: finalState === "error" ? <XCircle size={16} /> : <PackageCheck size={16} /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 sm:grid-cols-4">
      {stages.map((stage) => (
        <div className="min-w-0" key={stage.label}>
          <div className={`flex size-8 items-center justify-center rounded-full ${progressTone(stage.state)}`}>{stage.icon}</div>
          <p className="mt-2 truncate text-xs font-extrabold">{stage.label}</p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">
            {stage.time ? formatThaiMediumDateTime(stage.time) : progressLabel(stage.state)}
          </p>
        </div>
      ))}
    </div>
  );
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

type TrackingStatus = "ALL" | "WAITING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

function normalizeTrackingStatus(status?: string): TrackingStatus {
  return ["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELED"].includes(String(status))
    ? String(status) as TrackingStatus
    : "ALL";
}

function trackingStatusValues(status: TrackingStatus): string[] | null {
  if (status === "WAITING") return [StoreIssueStatus.WAITING_ENGINEER_APPROVAL];
  if (status === "IN_PROGRESS") return [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED, StoreIssueStatus.RETURNED_FOR_EDIT];
  if (status === "COMPLETED") return [StoreIssueStatus.ISSUED];
  if (status === "CANCELED") return [StoreIssueStatus.ENGINEER_REJECTED, StoreIssueStatus.NOT_ENOUGH_STOCK, StoreIssueStatus.STORE_REJECTED, StoreIssueStatus.CANCELED];
  return null;
}

function issueStatusGroup(status: string) {
  if (status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL) return "WAITING";
  if ([StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED, StoreIssueStatus.RETURNED_FOR_EDIT].includes(status as never)) return "IN_PROGRESS";
  if (status === StoreIssueStatus.ISSUED) return "COMPLETED";
  return "CANCELED";
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
    return [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.NOT_ENOUGH_STOCK].includes(status as never);
  }
  return role === RoleName.ADMIN && [
    StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
    StoreIssueStatus.RETURNED_FOR_EDIT,
    StoreIssueStatus.WAITING_STORE_ISSUE,
    StoreIssueStatus.NOT_ENOUGH_STOCK,
  ].includes(status as never);
}

function DecisionButton({ decision, icon, label }: { decision: string; icon: React.ReactNode; label: string }) {
  return (
    <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]" name="decision" value={decision}>
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
  const tone = issueStatusGroup(status) === "WAITING"
    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
    : issueStatusGroup(status) === "IN_PROGRESS"
      ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
      : issueStatusGroup(status) === "COMPLETED"
        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
        : "bg-red-500/15 text-red-700 dark:text-red-300";
  return <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${tone}`}>{labels[status] ?? status}</span>;
}

function storeScope(scope: Awaited<ReturnType<typeof resolveStorePageScope>>) {
  return {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    plantCode: scope.plant.code,
  };
}

function issueRedirect(
  scope: Awaited<ReturnType<typeof resolveStorePageScope>>,
  result: Record<string, string>,
) {
  const params = new URLSearchParams({
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    ...result,
  });
  return `/dashboardstore/issue?${params}`;
}

function optionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function storeActionError(error: unknown) {
  if (!(error instanceof Error)) return "โปรดลองใหม่อีกครั้ง";
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
  return expected.some((text) => error.message.includes(text))
    ? error.message
    : "ไม่สามารถดำเนินการได้ โปรดตรวจสอบข้อมูลและลองใหม่";
}

function buildStoreStockStatus(quantity: number, minStock: number) {
  if (quantity <= 0) return "OUT";
  if (quantity <= minStock) return "LOW";
  return "ENOUGH";
}

function formatQty(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
