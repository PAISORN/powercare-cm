import {
  Beaker,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
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
  if (trackingOnly && !canTrack && !canApprove && !canIssue) redirect("/dashboard");
  if (!trackingOnly && !canCreate) redirect("/inventory/issue?view=tracking");
  const scope = await resolveStorePageScope(user, query);

  const [stocks, issueZones, cmWorks, issues] = await Promise.all([
    db.storeStock.findMany({
      where: { plantId: scope.plant.id, quantity: { gt: 0 }, store: { active: true }, sparePart: { active: true } },
      include: {
        store: { select: { id: true, code: true, name: true, category: { select: { name: true } } } },
        sparePart: {
          select: {
            id: true,
            code: true,
            itemCode: true,
            itemKind: true,
            name: true,
            unit: true,
            minStock: true,
            type: { select: { name: true } },
            category: { select: { name: true } },
            materialGroup: { select: { name: true } },
          },
        },
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
    db.sparePartIssue.findMany({
      where: {
        plantId: scope.plant.id,
        ...(!canApprove && !canIssue ? { requesterUserId: user.id } : {}),
      },
      include: {
        cmWork: { select: { number: true } },
        requesterUser: { select: { fullName: true } },
        engineer: { select: { fullName: true, signature: { select: { id: true } } } },
        storeOfficer: { select: { fullName: true, signature: { select: { id: true } } } },
        items: {
          include: {
            store: { select: { code: true, name: true } },
            sparePart: { select: { code: true, name: true, unit: true, itemKind: true } },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { requestedAt: "desc" },
      take: 50,
    }),
  ]);

  const selectedTrackingStatus = normalizeTrackingStatus(query.status);
  const selectedTrackingKind = resolveItemKind(query.itemKind);
  const trackingSearch = String(query.q ?? "").trim().toLocaleLowerCase("th-TH");
  const kindIssues = issues.filter((issue) => issue.itemKind === selectedTrackingKind);
  const statusCounts = {
    all: kindIssues.length,
    waiting: kindIssues.filter((issue) => issueStatusGroup(issue.status) === "WAITING").length,
    inProgress: kindIssues.filter((issue) => issueStatusGroup(issue.status) === "IN_PROGRESS").length,
    completed: kindIssues.filter((issue) => issueStatusGroup(issue.status) === "COMPLETED").length,
    canceled: kindIssues.filter((issue) => issueStatusGroup(issue.status) === "CANCELED").length,
  };
  const filteredIssues = kindIssues.filter((issue) => {
    if (selectedTrackingStatus !== "ALL" && issueStatusGroup(issue.status) !== selectedTrackingStatus) return false;
    if (!trackingSearch) return true;
    const haystack = [
      issue.number,
      issue.cmWork?.number,
      issue.requesterUser?.fullName,
      issue.requesterName,
      ...issue.items.flatMap((item) => [item.sparePart.code, item.sparePart.name, item.lineNumber]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("th-TH");
    return haystack.includes(trackingSearch);
  });
  const trackingPageSize = 5;
  const totalTrackingPages = Math.max(1, Math.ceil(filteredIssues.length / trackingPageSize));
  const requestedTrackingPage = Number.parseInt(query.trackingPage ?? "1", 10);
  const currentTrackingPage = Number.isFinite(requestedTrackingPage) && requestedTrackingPage > 0
    ? Math.min(requestedTrackingPage, totalTrackingPages)
    : 1;
  const pagedFilteredIssues = filteredIssues.slice(
    (currentTrackingPage - 1) * trackingPageSize,
    currentTrackingPage * trackingPageSize,
  );
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
    return `/inventory/issue?${params.toString()}#issue-tracking`;
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
    return `/inventory/issue?${params.toString()}#issue-tracking`;
  };

  function CompactIssueRow({ issue }: { issue: (typeof issues)[number] }) {
    const itemSummary = issue.items
      .map((item) => `${item.sparePart.code} ${item.sparePart.name}`)
      .join(", ");
    return (
      <article className="issue-row-two-line overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--card)] shadow-[var(--shadow)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--primary)]">
        <div className="hidden h-1 bg-[var(--primary)]" />
        <div className="p-4 sm:p-5">
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
          {canPrintSparePartIssueDocument(user, issue) ? (
            <Link
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-3 text-sm font-extrabold text-[var(--primary)] transition hover:-translate-y-0.5 hover:bg-[var(--primary)] hover:text-white"
              href={`/inventory/issue/${issue.id}/print`}
              rel="noreferrer"
              target="_blank"
            >
              <Printer size={16} />
              พิมพ์เอกสาร
            </Link>
          ) : null}
          <details className="group rounded-2xl border border-[var(--line)] bg-[var(--soft)] sm:col-span-2">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-2 text-sm font-extrabold text-white transition hover:bg-[var(--primary-strong)]">
              ตรวจสอบใบเบิก
              <ChevronDown className="transition group-open:rotate-180" size={16} />
            </summary>
            <div className="grid gap-3 border-t border-[var(--line)] p-3 sm:col-span-2">
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
                <form action={engineerDecisionAction} className="grid gap-2 rounded-xl bg-[var(--surface)] p-3 sm:grid-cols-[1fr_repeat(3,auto)] sm:items-end">
                  <AdminScopeHiddenFields scope={scope} />
                  <input name="issueId" type="hidden" value={issue.id} />
                  <label className="grid gap-1 text-sm font-bold">
                    Reason
                    <input className={inputClass} name="reason" />
                  </label>
                  <DecisionButton decision="APPROVE" icon={<CheckCircle2 size={16} />} label="Approve" />
                  <DecisionButton decision="RETURN" icon={<RotateCcw size={16} />} label="Return" />
                  <DecisionButton decision="REJECT" icon={<XCircle size={16} />} label="Reject" />
                </form>
              ) : null}

              {canIssue && responsibilityKinds.has(issue.itemKind) && issue.requesterUserId !== user.id && issue.engineerId !== user.id && [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED].includes(issue.status as never) ? (
                <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
                  <form action={issueStockAction} className="grid gap-2 rounded-xl bg-[var(--surface)] p-3">
                    <AdminScopeHiddenFields scope={scope} />
                    <input name="issueId" type="hidden" value={issue.id} />
                    <p className="text-sm font-bold">จ่ายอะไหล่ครบทั้งใบเบิก {issue.items.length} รายการ</p>
                    <p className="text-xs text-[var(--muted)]">ระบบจะตรวจสต็อกทุกรายการก่อน และจะไม่หักสต็อกหากมีรายการใดไม่เพียงพอ</p>
                    <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]">
                      จ่ายอะไหล่ทั้งใบ
                    </button>
                  </form>
                  <form action={notEnoughStockAction} className="grid content-end gap-2 rounded-xl bg-[var(--surface)] p-3">
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
                  </form>
                </div>
              ) : null}

              {canCancelIssue(user.role, issue.status, issue.items) ? (
                <form action={cancelIssueAction} className="grid gap-2 rounded-xl border border-red-500/25 bg-red-500/5 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <AdminScopeHiddenFields scope={scope} />
                  <input name="issueId" type="hidden" value={issue.id} />
                  <label className="grid gap-1 text-sm font-bold">
                    เหตุผลการยกเลิก
                    <input className={inputClass} name="reason" required />
                  </label>
                  <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/35 px-4 font-bold text-red-600 transition hover:bg-red-500/10">
                    <XCircle size={17} /> ยกเลิกใบเบิก
                  </button>
                </form>
              ) : null}

              {issue.rejectReason ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">Reason: {issue.rejectReason}</p> : null}
              {(issue.engineer || issue.storeOfficer) ? (
                <p className="text-xs text-[var(--muted)]">
                  Engineer: {issue.engineer?.fullName ?? "-"} · Store Officer: {issue.storeOfficer?.fullName ?? "-"}
                </p>
              ) : null}
            </div>
          </details>
        </div>
        </div>
      </article>
    );
  }

  return (
    <AppShell immersiveMobile>
      <div className="issue-request-page-gradient -mb-28 min-h-screen pb-28">
        <div
          className={`mx-auto grid w-full items-start gap-5 ${
            trackingOnly ? "max-w-[96rem]" : "max-w-3xl"
          }`}
        >
        {!trackingOnly ? (
        <section
          className="space-y-5"
          data-testid="issue-create-workspace"
        >
        {query.created ? (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">
            ส่งคำขอเบิกสำเร็จ เลขที่ใบเบิก: <span className="font-mono">{query.created}</span>
          </p>
        ) : null}
        {query.saved ? (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-bold text-emerald-700 dark:text-emerald-300">
            บันทึกการดำเนินการเรียบร้อยแล้ว
          </p>
        ) : null}
        {query.error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-bold text-red-700 dark:text-red-300" role="alert">
            ดำเนินการไม่สำเร็จ: {query.error}
          </p>
        ) : null}
        {canCreate && !issueZones.length ? (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-200">
            Site นี้ยังไม่มี Applicable Zone ที่เปิดใช้งาน จึงยังสร้างใบเบิกไม่ได้ กรุณากำหนดรหัส Zone ในหน้า Spare Parts ก่อน
          </div>
        ) : null}

        {canCreate ? (
          <section>
            <IssueRequestForm
              action={createIssueAction}
              cmWorks={cmWorks.map((work) => ({
                id: work.id,
                number: work.number,
                label: `${work.machineName} · ${work.problemTitle}`,
              }))}
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
              singleCard
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
          </section>
        ) : null}
        </section>
        ) : null}

        {trackingOnly ? (
        <>
          <header className="px-1 py-2 text-white">
            <div className="flex items-start gap-4">
              <span className="mt-1 grid size-20 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/10 text-white">
                <Package aria-hidden="true" size={38} strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black leading-tight sm:text-3xl">ติดตามสถานะใบเบิก</h2>
                <p className="mt-1 text-sm font-bold text-white/80">PowerCare Store · {issueKindLabel(selectedTrackingKind)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1 text-[11px] font-bold sm:gap-2 sm:text-xs">
                  <span className="whitespace-nowrap rounded-full bg-white/10 px-2 py-1.5 text-white/90 sm:px-2.5">
                    {scope.plant.name}
                  </span>
                  <span className="whitespace-nowrap rounded-full bg-white/10 px-2 py-1.5 text-white/80 sm:px-2.5">
                    ใบเบิก · {filteredIssues.length} รายการ
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-400/15 px-2 py-1.5 text-emerald-300 sm:gap-1.5 sm:px-2.5">
                    <span className="size-2 rounded-full bg-emerald-400" /> เปิดให้บริการ
                  </span>
                </div>
              </div>
            </div>
          </header>
          <section className="mt-3 h-full rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5" id="issue-tracking">
          <div className="hidden flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="text-[var(--primary)]" size={21} />
              <h2 className="text-xl font-extrabold">ติดตามสถานะใบเบิก</h2>
            </div>
            <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-bold">{filteredIssues.length} รายการ</span>
          </div>
          <p className="hidden">ติดตามความคืบหน้าและดำเนินการใบเบิกอะไหล่ภายใน Site</p>

          <IssueTrackingTabs
            itemKind={selectedTrackingKind}
            organizationId={scope.organization.id}
            plantId={scope.plant.id}
            query={query.q}
            status={selectedTrackingStatus}
          />

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <TrackingStat active={selectedTrackingStatus === "ALL"} href={trackingStatusHref("ALL")} icon={<ClipboardList size={28} />} label="ทั้งหมด" value={statusCounts.all} />
            <TrackingStat active={selectedTrackingStatus === "WAITING"} href={trackingStatusHref("WAITING")} icon={<Clock3 size={28} />} label="รออนุมัติ" tone="amber" value={statusCounts.waiting} />
            <TrackingStat active={selectedTrackingStatus === "IN_PROGRESS"} href={trackingStatusHref("IN_PROGRESS")} icon={<Settings2 size={28} />} label="ดำเนินการ" tone="blue" value={statusCounts.inProgress} />
            <TrackingStat active={selectedTrackingStatus === "COMPLETED"} href={trackingStatusHref("COMPLETED")} icon={<PackageCheck size={28} />} label="เสร็จสิ้น" tone="green" value={statusCounts.completed} />
            <TrackingStat active={selectedTrackingStatus === "CANCELED"} href={trackingStatusHref("CANCELED")} icon={<XCircle size={28} />} label="ยกเลิก" tone="red" value={statusCounts.canceled} />
          </div>

          <form action="/inventory/issue" className="mt-4 grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
            <AdminScopeHiddenFields scope={scope} />
            <input name="view" type="hidden" value="tracking" />
            <input name="itemKind" type="hidden" value={selectedTrackingKind} />
            <label className="relative">
              <span className="sr-only">ค้นหาใบเบิก</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
              <input className={`${inputClass} pl-10`} defaultValue={query.q ?? ""} name="q" placeholder="ค้นหาเลขใบเบิก, เลข CM, ผู้ขอ หรืออะไหล่" />
            </label>
            <label>
              <span className="sr-only">สถานะใบเบิก</span>
              <select className={inputClass} defaultValue={selectedTrackingStatus} name="status">
                <option value="ALL">สถานะทั้งหมด</option>
                <option value="WAITING">รออนุมัติ</option>
                <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                <option value="COMPLETED">เสร็จสิ้น</option>
                <option value="CANCELED">ยกเลิก / ปฏิเสธ</option>
              </select>
            </label>
            <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--primary-strong)]">
              <Search size={17} /> ค้นหา
            </button>
          </form>
          <div className="mt-4 grid gap-2">
            {pagedFilteredIssues.map((issue) => (
              <div key={issue.id}>
                <CompactIssueRow issue={issue} />
                <article className="hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-base font-extrabold text-[var(--primary)]">{issue.number}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {issue.cmWork?.number ? `CM: ${issue.cmWork.number}` : "เบิกโดยตรง"} · {formatThaiMediumDateTime(issue.requestedAt)}
                    </p>
                    <p className="mt-1 text-sm">ผู้ขอ: {issue.requesterUser?.fullName ?? issue.requesterName}</p>
                  </div>
                  <StoreIssueStatusBadge status={issue.status} />
                </div>

                <div className="mt-3 grid gap-2">
                  {issue.items.map((item) => {
                    const approved = Number(item.approvedQty ?? item.requestedQty);
                    const issued = Number(item.issuedQty ?? 0);
                    return (
                      <div className="grid gap-1 rounded-xl bg-[var(--soft)] p-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center" key={item.id}>
                        <div>
                          <p className="font-bold">{item.sparePart.code} · {item.sparePart.name}</p>
                          {item.lineNumber ? <p className="font-mono text-[11px] text-[var(--primary)]">{item.lineNumber}</p> : null}
                          <p className="text-xs text-[var(--muted)]">{item.store?.code ?? "-"} · ขอ {formatQty(Number(item.requestedQty))} {item.sparePart.unit}</p>
                        </div>
                        <p className="font-bold">จ่ายแล้ว {formatQty(issued)} / {formatQty(approved)}</p>
                      </div>
                    );
                  })}
                </div>

                {canApprove && approvalKinds.has(issue.itemKind) && issue.requesterUserId !== user.id && issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL ? (
                  <form action={engineerDecisionAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_repeat(3,auto)] sm:items-end">
                    <AdminScopeHiddenFields scope={scope} />
                    <input name="issueId" type="hidden" value={issue.id} />
                    <label className="grid gap-1 text-sm font-bold">
                      หมายเหตุสำหรับ Reject / ส่งกลับ
                      <input className={inputClass} name="reason" />
                    </label>
                    <DecisionButton decision="APPROVE" icon={<CheckCircle2 size={16} />} label="อนุมัติ" />
                    <DecisionButton decision="RETURN" icon={<RotateCcw size={16} />} label="ส่งกลับแก้ไข" />
                    <DecisionButton decision="REJECT" icon={<XCircle size={16} />} label="Reject" />
                  </form>
                ) : null}

                {canIssue && responsibilityKinds.has(issue.itemKind) && issue.requesterUserId !== user.id && issue.engineerId !== user.id && [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED].includes(issue.status as never) ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                    <form action={issueStockAction} className="grid gap-2">
                      <AdminScopeHiddenFields scope={scope} />
                      <input name="issueId" type="hidden" value={issue.id} />
                      <p className="text-sm font-bold">จ่ายอะไหล่ครบทั้งใบเบิก {issue.items.length} รายการ</p>
                      <p className="text-xs text-[var(--muted)]">ตรวจสต็อกครบทุกบรรทัดและบันทึกการจ่ายด้วยการกดเพียงครั้งเดียว</p>
                      <button className="mt-1 min-h-12 rounded-xl bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]">
                        จ่ายอะไหล่ทั้งใบ
                      </button>
                    </form>
                    <form action={notEnoughStockAction} className="grid gap-2 lg:w-64">
                      <AdminScopeHiddenFields scope={scope} />
                      <input name="issueId" type="hidden" value={issue.id} />
                      <label className="grid gap-1 text-sm font-bold">
                        เหตุผลของไม่พอ
                        <input className={inputClass} name="reason" required />
                      </label>
                      <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 font-bold text-red-600 transition hover:bg-red-500/10">
                        <PackageX size={17} />
                        Not enough stock
                      </button>
                    </form>
                  </div>
                ) : null}

                {issue.rejectReason ? <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">เหตุผล: {issue.rejectReason}</p> : null}
                {(issue.engineer || issue.storeOfficer) ? (
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Engineer: {issue.engineer?.fullName ?? "-"} · Store Officer: {issue.storeOfficer?.fullName ?? "-"}
                  </p>
                ) : null}
                </article>
              </div>
            ))}
            {!filteredIssues.length ? <p className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">ไม่พบใบเบิกตามเงื่อนไขที่เลือก</p> : null}
          </div>
          {totalTrackingPages > 1 ? (
            <nav aria-label="Issue tracking pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
              <span className="text-sm font-semibold text-[var(--muted)]">
                หน้า {currentTrackingPage} จาก {totalTrackingPages}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                <Link
                  aria-disabled={currentTrackingPage === 1}
                  aria-label="หน้าก่อนหน้า"
                  className={trackingPaginationArrowClass(currentTrackingPage === 1)}
                  href={trackingPageHref(Math.max(1, currentTrackingPage - 1))}
                >
                  <ChevronLeft size={16} />
                </Link>
                {paginationWindow(currentTrackingPage, totalTrackingPages).map((pageNumber) => (
                  <Link
                    aria-current={pageNumber === currentTrackingPage ? "page" : undefined}
                    className={trackingPaginationPageClass(pageNumber === currentTrackingPage)}
                    href={trackingPageHref(pageNumber)}
                    key={pageNumber}
                  >
                    {pageNumber}
                  </Link>
                ))}
                <Link
                  aria-disabled={currentTrackingPage === totalTrackingPages}
                  aria-label="หน้าถัดไป"
                  className={trackingPaginationArrowClass(currentTrackingPage === totalTrackingPages)}
                  href={trackingPageHref(Math.min(totalTrackingPages, currentTrackingPage + 1))}
                >
                  <ChevronRight size={16} />
                </Link>
              </div>
            </nav>
          ) : null}
          </section>
        </>
        ) : null}
        </div>
      </div>
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
              href={`/inventory/issue?${params.toString()}#issue-tracking`}
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
  return [
    "inline-flex size-9 items-center justify-center rounded-xl text-sm font-extrabold transition",
    isActive
      ? "bg-[var(--primary)] text-white shadow-sm"
      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--soft)]",
  ].join(" ");
}

function trackingPaginationArrowClass(isDisabled: boolean) {
  return [
    "inline-flex size-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] transition hover:bg-[var(--soft)]",
    isDisabled ? "pointer-events-none opacity-45" : "",
  ].join(" ");
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
    neutral: "stock-summary-violet",
    amber: "stock-summary-orange",
    blue: "stock-summary-blue",
    green: "stock-summary-green",
    red: "stock-summary-red",
  };
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`stock-summary-card relative min-h-36 overflow-hidden rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 sm:p-5 ${surfaces[tone]} ${active ? "ring-2 ring-[var(--primary)]/45" : ""}`}
      href={href}
      scroll={false}
    >
      <div className="relative z-10 flex h-full items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold leading-5">{label}</p>
          <p className="mt-3 break-words text-2xl font-black tracking-tight sm:text-3xl">{value}</p>
          <p className="mt-2 text-xs font-bold text-[var(--muted)]">รายการ</p>
        </div>
        <span className="stock-summary-icon grid size-11 shrink-0 place-items-center rounded-xl">{icon}</span>
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

function normalizeTrackingStatus(status?: string) {
  return ["WAITING", "IN_PROGRESS", "COMPLETED", "CANCELED"].includes(String(status))
    ? String(status)
    : "ALL";
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
  return `/inventory/issue?${params}`;
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
