import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileUp,
  PackageCheck,
  PackageX,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields, AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { IssueRequestForm } from "../../../components/store/issue-request-form";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import {
  approveStoreIssue,
  createLoggedInStoreIssue,
  issueStoreStock,
  markIssueNotEnoughStock,
} from "../../../modules/store/store-issue-prisma";
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
        note: optionalText(formData.get("note")),
        requestedAt: new Date(),
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
  redirect(issueRedirect(scope, actionError ? { error: actionError } : { saved: "decision" }));
}

async function issueStockAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const itemIds = formData.getAll("itemId").map(String);
  const quantities = formData.getAll("issueQty").map(Number);
  let actionError: string | null = null;
  try {
    await issueStoreStock(
      user,
      storeScope(scope),
      String(formData.get("issueId") ?? ""),
      itemIds.map((itemId, index) => ({ itemId, quantity: quantities[index] })),
    );
  } catch (error) {
    actionError = storeActionError(error);
  }
  redirect(issueRedirect(scope, actionError ? { error: actionError } : { saved: "issued" }));
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
  redirect(issueRedirect(scope, actionError ? { error: actionError } : { saved: "not-enough" }));
}

export default async function IssuePage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  const canCreate = canUseUserPermission(user, PermissionKey.CREATE_STORE_ISSUE);
  const canApprove = canUseUserPermission(user, PermissionKey.APPROVE_STORE_ISSUE);
  const canIssue = canUseUserPermission(user, PermissionKey.ISSUE_STOCK);
  if (!canCreate && !canApprove && !canIssue) redirect("/dashboard");
  const query = await searchParams;
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
            name: true,
            unit: true,
            minStock: true,
            category: { select: { name: true } },
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
            sparePart: { select: { code: true, name: true, unit: true } },
          },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { requestedAt: "desc" },
      take: 50,
    }),
  ]);

  const selectedTrackingStatus = normalizeTrackingStatus(query.status);
  const trackingSearch = String(query.q ?? "").trim().toLocaleLowerCase("th-TH");
  const statusCounts = {
    all: issues.length,
    waiting: issues.filter((issue) => issueStatusGroup(issue.status) === "WAITING").length,
    inProgress: issues.filter((issue) => issueStatusGroup(issue.status) === "IN_PROGRESS").length,
    completed: issues.filter((issue) => issueStatusGroup(issue.status) === "COMPLETED").length,
    canceled: issues.filter((issue) => issueStatusGroup(issue.status) === "CANCELED").length,
  };
  const filteredIssues = issues.filter((issue) => {
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

  function CompactIssueRow({ issue }: { issue: (typeof issues)[number] }) {
    const itemSummary = issue.items
      .map((item) => `${item.sparePart.code} ${item.sparePart.name}`)
      .join(", ");
    return (
      <article className="issue-row-two-line overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] transition hover:-translate-y-0.5 hover:border-[var(--primary)]">
        <div className="h-1 bg-[var(--primary)]" />
        <div className="p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate font-mono text-base font-extrabold text-[var(--primary)]">{issue.number}</p>
              <StoreIssueStatusBadge status={issue.status} />
            </div>
            <p className="mt-1 truncate text-sm text-[var(--muted)]">
              {issue.cmWork?.number ? `CM: ${issue.cmWork.number}` : "Direct issue"} · {issue.requesterUser?.fullName ?? issue.requesterName} · {formatThaiMediumDateTime(issue.requestedAt)}
            </p>
            <p className="mt-1 truncate text-sm font-semibold">{itemSummary || "-"}</p>
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
          <details className="group rounded-xl border border-[var(--line)] bg-[var(--soft)] sm:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-2 px-3 py-2 text-sm font-extrabold text-[var(--primary)]">
              ดูรายละเอียด
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

              {canApprove && issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL ? (
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

              {canIssue && [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED].includes(issue.status as never) ? (
                <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
                  <form action={issueStockAction} className="grid gap-2 rounded-xl bg-[var(--surface)] p-3">
                    <AdminScopeHiddenFields scope={scope} />
                    <input name="issueId" type="hidden" value={issue.id} />
                    {issue.items.map((item) => {
                      const remaining = Number(item.approvedQty ?? item.requestedQty) - Number(item.issuedQty ?? 0);
                      return (
                        <label className="grid gap-1 text-sm font-bold sm:grid-cols-[1fr_140px] sm:items-center" key={item.id}>
                          <span className="truncate">{item.sparePart.code} · Remain {formatQty(remaining)} {item.sparePart.unit}</span>
                          <input name="itemId" type="hidden" value={item.id} />
                          <input className={inputClass} defaultValue={remaining} max={remaining} min="0" name="issueQty" step="0.01" type="number" />
                        </label>
                      );
                    })}
                    <button className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]">
                      Issue Stock
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
    <AppShell>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <header className="flex flex-wrap items-start justify-between gap-4 xl:col-span-2">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--primary)] shadow-sm">
                <FileUp size={22} />
              </span>
              <h1 className="text-2xl font-extrabold sm:text-3xl">ใบเบิกอะไหล่ / ติดตามสถานะ</h1>
            </div>
            <nav aria-label="Breadcrumb" className="mt-3 flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
              <span className="text-[var(--primary)]">เบิกอะไหล่</span>
              <ChevronRight size={15} />
              <span>ใบเบิกอะไหล่</span>
            </nav>
          </div>
          <a className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold hover:border-[var(--primary)] hover:text-[var(--primary)]" href="#issue-tracking">
            <ClipboardList size={17} />
            ติดตามสถานะ
          </a>
        </header>

        <section
          className="space-y-5 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5"
          data-testid="issue-create-workspace"
        >
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-[var(--primary)]" size={21} />
            <h2 className="text-xl font-extrabold">สร้างใบขอเบิกอะไหล่</h2>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">เลือกงาน CM หรือเบิกโดยตรง แล้วระบุอะไหล่ที่ต้องการ</p>
        </div>

        <AdminSiteScopeSelector action="/inventory/issue" compact scope={scope} title="Site สำหรับใบเบิก" />

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
              issueZones={issueZones.map((item) => ({ ...item.zone, code: item.code }))}
              stocks={stocks.map((stock) => ({
                storeId: stock.storeId,
                sparePartId: stock.sparePartId,
                label: `${stock.store.code} · ${stock.sparePart.code} · ${stock.sparePart.name}`,
                available: Number(stock.quantity),
                unit: stock.sparePart.unit,
                storeCode: stock.store.code,
                storeName: stock.store.name,
                storeCategoryName: stock.store.category?.name,
                sparePartCode: stock.sparePart.code,
                sparePartName: stock.sparePart.name,
                sparePartCategoryName: stock.sparePart.category?.name,
                itemCode: stock.sparePart.itemCode,
                stockStatus: buildStoreStockStatus(Number(stock.quantity), Number(stock.sparePart.minStock)),
              }))}
            />
          </section>
        ) : null}
        </section>

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5" id="issue-tracking">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="text-[var(--primary)]" size={21} />
              <h2 className="text-xl font-extrabold">ติดตามสถานะใบเบิก</h2>
            </div>
            <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-sm font-bold">{filteredIssues.length} รายการ</span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">ติดตามความคืบหน้าและดำเนินการใบเบิกอะไหล่ภายใน Site</p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
            <TrackingStat icon={<ClipboardList size={18} />} label="ทั้งหมด" value={statusCounts.all} />
            <TrackingStat icon={<Clock3 size={18} />} label="รออนุมัติ" tone="amber" value={statusCounts.waiting} />
            <TrackingStat icon={<Settings2 size={18} />} label="ดำเนินการ" tone="blue" value={statusCounts.inProgress} />
            <TrackingStat icon={<PackageCheck size={18} />} label="เสร็จสิ้น" tone="green" value={statusCounts.completed} />
            <TrackingStat icon={<XCircle size={18} />} label="ยกเลิก" tone="red" value={statusCounts.canceled} />
          </div>

          <form action="/inventory/issue" className="mt-4 grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3 sm:grid-cols-[minmax(0,1fr)_170px_auto]">
            <AdminScopeHiddenFields scope={scope} />
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
            {filteredIssues.map((issue) => (
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

                {canApprove && issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL ? (
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

                {canIssue && [StoreIssueStatus.WAITING_STORE_ISSUE, StoreIssueStatus.PARTIALLY_ISSUED].includes(issue.status as never) ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                    <form action={issueStockAction} className="grid gap-2">
                      <AdminScopeHiddenFields scope={scope} />
                      <input name="issueId" type="hidden" value={issue.id} />
                      {issue.items.map((item) => {
                        const remaining = Number(item.approvedQty ?? item.requestedQty) - Number(item.issuedQty ?? 0);
                        return (
                          <label className="grid gap-1 text-sm font-bold sm:grid-cols-[1fr_160px] sm:items-center" key={item.id}>
                            <span>{item.sparePart.code} · คงเหลือต้องจ่าย {formatQty(remaining)} {item.sparePart.unit}</span>
                            <input name="itemId" type="hidden" value={item.id} />
                            <input className={inputClass} defaultValue={remaining} max={remaining} min="0" name="issueQty" step="0.01" type="number" />
                          </label>
                        );
                      })}
                      <button className="mt-1 min-h-12 rounded-xl bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]">
                        จ่าย Stock ตามจำนวน
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
        </section>
      </div>
    </AppShell>
  );
}

function TrackingStat({
  icon,
  label,
  tone = "neutral",
  value,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "amber" | "blue" | "green" | "red";
  value: number;
}) {
  const tones = {
    neutral: "text-[var(--muted)]",
    amber: "text-amber-500",
    blue: "text-sky-500",
    green: "text-emerald-500",
    red: "text-red-500",
  };
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--soft)] ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-[var(--muted)]">{label}</p>
        <p className={`text-xl font-extrabold ${tones[tone]}`}>{value}</p>
      </div>
    </div>
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

function storeActionError(error: unknown) {
  if (!(error instanceof Error)) return "โปรดลองใหม่อีกครั้ง";
  const expected = [
    "required",
    "invalid",
    "not found",
    "outside",
    "exceeds",
    "Not enough stock",
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
