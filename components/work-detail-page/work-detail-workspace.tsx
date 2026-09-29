import Link from "next/link";
import {
  Building2,
  Check,
  ClipboardList,
  FileText,
  History,
  Settings,
  ShoppingCart,
  UserRound,
  Wrench,
  Zap,
} from "lucide-react";
import {
  assignWorkDetailAction,
  cancelOwnPendingStoreIssueAction as cancelOwnPendingStoreIssueMutation,
  cancelWorkDetailAction,
  claimWorkDetailAction,
  closeWorkDetailAction,
  createWorkStoreIssueAction as createWorkStoreIssueMutation,
  moveWorkToBacklogShutdownAction,
  releaseWorkDetailAction,
  returnWorkDetailAction,
  startWorkDetailAction,
  submitWorkReviewAction,
  updateWorkProgressAction,
} from "../../app/work/[id]/actions";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { canClaimWork } from "../../modules/auth/permission";
import {
  buildStoreStockStatus,
  type WorkDetailPageData,
} from "../../modules/cm-work/work-detail-page-data";
import {
  WorkStatus,
  statusLabels,
  urgencyLabels,
  type Urgency,
} from "../../modules/cm-work/cm-work-types";
import { StatusBadge } from "../status-badge";
import { IssueRequestForm } from "../store/issue-request-form";
import { WorkAssignmentForm } from "../work-assignment-form";
import {
  ReviewDetail,
  StoreIssuePanel,
  technicianCompletionTimelineNote,
  WorkMetaItem,
  WorkStatusTimelineRow,
} from "./work-detail-support";

export function WorkDetailWorkspace({ data }: { data: WorkDetailPageData }) {
  const {
    actor,
    canCancel,
    canMoveToBacklogShutdown,
    canRelease,
    canRequestStoreIssue,
    canReview,
    canSubmit,
    hasPendingStoreIssues,
    issueZones,
    isClaimant,
    mayAssign,
    query,
    shouldUpdateProgress,
    statusActorNameById,
    storeIssues,
    storeStocks,
    technicians,
    user,
    work,
    workOrganizationId,
    workPlantId,
    workspaceTab,
  } = data;
  const claimAction = claimWorkDetailAction.bind(null, work.id);
  const assignAction = assignWorkDetailAction.bind(null, work.id);
  const startAction = startWorkDetailAction.bind(null, work.id);
  const submitReviewAction = submitWorkReviewAction.bind(null, work.id);
  const releaseAction = releaseWorkDetailAction.bind(null, work.id);
  const moveToBacklogShutdownAction = moveWorkToBacklogShutdownAction.bind(null, work.id);
  const returnAction = returnWorkDetailAction.bind(null, work.id);
  const closeAction = closeWorkDetailAction.bind(null, work.id);
  const cancelAction = cancelWorkDetailAction.bind(null, work.id);
  const progressUpdateAction = updateWorkProgressAction.bind(null, work.id);
  const createWorkStoreIssueAction = createWorkStoreIssueMutation.bind(null, work.id);
  const cancelOwnPendingStoreIssueAction = cancelOwnPendingStoreIssueMutation.bind(null, work.id);
  return (
    <>
      <section className="work-detail-hero mx-auto w-full max-w-3xl rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--line)] pb-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--soft)] text-[var(--primary)]">
              <Wrench aria-hidden="true" size={30} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-extrabold tracking-tight text-[var(--ink)]">{work.number}</h1>
              <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                {work.machineName} <span className="mx-2 text-[var(--muted)]/60">•</span> {work.category.name} <span className="mx-2 text-[var(--muted)]/60">•</span> {work.zone.name}
              </p>
            </div>
          </div>
          <StatusBadge status={work.status} />
        </div>

        <section className="work-detail-grid work-meta-strip mt-5 grid overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--soft)]/45 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <WorkMetaItem icon={UserRound} label="ผู้แจ้ง" value={work.requesterName} />
          <WorkMetaItem icon={Building2} label="หน่วยงาน" value={work.requesterDepartment} />
          <WorkMetaItem icon={Zap} label="ความเร่งด่วน" value={urgencyLabels[work.urgency as Urgency]} />
          <WorkMetaItem icon={UserRound} label="ผู้รับงาน" value={work.claimant?.fullName ?? "-"} />
          <WorkMetaItem icon={ClipboardList} label="หัวข้อ" value={work.problemTitle} />
          <WorkMetaItem icon={FileText} label="รายละเอียด" value={work.problemDetail} wide />
        </section>
      </section>

      {work.originatingPmWork ? <div className="mx-auto mt-4 w-full max-w-3xl rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm"><strong>สร้างจากผล PM:</strong> <Link className="font-bold text-emerald-700 underline" href={`/dashboardpm/work/${work.originatingPmWork.id}?organizationId=${work.organizationId}&plantId=${work.plantId}`}>{work.originatingPmWork.number}</Link></div> : null}

      {query.assignmentError === "1" ? (
        <p className="mt-6 rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">
          ไม่สามารถมอบหมายงานได้ กรุณาตรวจสอบสิทธิ์ สถานะงาน และลองใหม่อีกครั้ง
        </p>
      ) : null}

      {query.storeIssueBlocked === "1" ? (
        <p className="mt-6 rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 font-semibold text-amber-700 dark:text-amber-300" role="alert">
          ยังมีใบเบิกอะไหล่ที่รออนุมัติหรือรอจ่ายของอยู่ กรุณาดำเนินการใบเบิกให้จบก่อนส่งรอปิดงาน
        </p>
      ) : null}
      {query.storeIssueCreated ? (
        <p className="mx-auto mt-6 w-full max-w-3xl rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-300" role="status">
          สร้างใบเบิกอะไหล่แล้ว: {query.storeIssueCreated}
        </p>
      ) : null}
      {query.storeIssueError ? (
        <p className="mt-6 rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">
          ไม่สามารถสร้างใบเบิกอะไหล่ได้: {query.storeIssueError}
        </p>
      ) : null}

      {false && mayAssign ? (
        <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <h2 className="text-xl font-bold">มอบหมายงานให้ช่าง</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            แสดงเฉพาะช่างที่เปิดใช้งานและอยู่ใน Category เดียวกับงานนี้
          </p>
          <div className="mt-4">
            <WorkAssignmentForm action={assignAction} technicians={technicians} />
          </div>
        </section>
      ) : null}

      <nav aria-label="เมนูดำเนินงานและใบเบิก" className="mx-auto mt-6 grid w-full max-w-3xl grid-cols-2 border-b border-white/35" data-testid="work-workspace-tabs">
        <Link
          aria-current={workspaceTab === "operations" ? "page" : undefined}
          className={`inline-flex min-h-14 items-center justify-center gap-2 border-b-2 px-4 font-extrabold transition ${workspaceTab === "operations" ? "border-white text-white" : "border-transparent text-white/65 hover:text-white"}`}
          href={`/work/${work.id}?workspaceTab=operations`}
        >
          <Settings size={20} /> การดำเนินงาน
        </Link>
        <Link
          aria-current={workspaceTab === "issue" ? "page" : undefined}
          className={`inline-flex min-h-14 items-center justify-center gap-2 border-b-2 px-4 font-extrabold transition ${workspaceTab === "issue" ? "border-white text-white" : "border-transparent text-white/65 hover:text-white"}`}
          href={`/work/${work.id}?workspaceTab=issue`}
        >
          <ShoppingCart size={20} /> สร้างใบเบิก
        </Link>
      </nav>

      <div className="work-operations-grid mx-auto mt-6 grid w-full max-w-3xl items-start gap-6">
        <div className={workspaceTab === "issue" ? "grid content-start gap-4" : "hidden"}>
          {canRequestStoreIssue ? (
            <section className="space-y-5" data-testid="work-store-issue-workspace">
          <IssueRequestForm
            action={createWorkStoreIssueAction}
            organizationId={workOrganizationId}
            plantId={workPlantId}
            issueZones={issueZones.map((item) => ({ ...item.zone, code: item.code }))}
            lockedCmWork={{ id: work.id, number: work.number, label: `${work.machineName} · ${work.problemTitle}` }}
            cmWorks={[{ id: work.id, number: work.number, label: `${work.machineName} · ${work.problemTitle}` }]}
            requesterSummary={{ name: user.fullName, department: user.category?.name }}
            siteSummary={{
              organizationName: work.organization?.name ?? "-",
              plantName: work.plant?.name ?? "-",
              inventoryCode: work.plant?.code,
            }}
            singleCard
            stocks={storeStocks.map((stock) => ({
              storeId: stock.store.id,
              sparePartId: stock.sparePart.id,
              sparePartItemKind: stock.sparePart.itemKind,
              label: `${stock.sparePart.code} · ${stock.sparePart.name} · ${stock.store.code}`,
              available: Number(stock.quantity),
              unit: stock.sparePart.unit,
              storeCode: stock.store.code,
              storeName: stock.store.name,
              storeCategoryName: stock.store.category?.name,
              sparePartCode: stock.sparePart.code,
              sparePartName: stock.sparePart.name,
              sparePartCategoryName: stock.sparePart.category?.name,
              sparePartMaterialGroupName: stock.sparePart.materialGroup?.name,
              itemCode: stock.sparePart.itemCode,
              stockStatus: buildStoreStockStatus(Number(stock.quantity), Number(stock.sparePart.minStock)),
            }))}
          />
            </section>
          ) : null}

        </div>

        <div className={workspaceTab === "operations" ? "grid content-start gap-6" : "hidden"}>
        <section className="work-operation-tabs rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <div className="mb-5 flex items-center gap-3">
            <Settings className="text-[var(--primary)]" size={23} />
            <h2 className="text-2xl font-extrabold">การดำเนินงาน</h2>
          </div>
          <section className="work-action-panel mb-4 flex flex-wrap gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)]/55 p-3">
            {canClaimWork(actor, work) ? (
              <form action={claimAction}>
                <button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]">
                  <Check size={17} />
                  รับงาน
                </button>
              </form>
            ) : null}
            {isClaimant && (work.status === WorkStatus.CLAIMED || work.status === WorkStatus.BACKLOG_SHUTDOWN) ? (
              <form action={startAction}>
                <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]">
                  <Wrench size={17} />
                  เริ่มดำเนินการ
                </button>
              </form>
            ) : null}
            {work.status === WorkStatus.CLOSED ? (
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]"
                href={`/work/${work.id}/print`}
                rel="noreferrer"
                target="_blank"
              >
                <FileText size={17} />
                พิมพ์เอกสาร
              </Link>
            ) : null}
          </section>

          {mayAssign ? (
            <section className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)]/55 p-4">
              <h3 className="text-lg font-extrabold">มอบหมายงานให้ช่าง</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                แสดงเฉพาะช่างที่เปิดใช้งานและอยู่ใน Category เดียวกับงานนี้
              </p>
              <div className="mt-4">
                <WorkAssignmentForm action={assignAction} technicians={technicians} />
              </div>
            </section>
          ) : null}

      {canSubmit ? (
        <form action={submitReviewAction} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)]/60 p-4">
          <label className="grid gap-2 text-sm font-bold">
            สาเหตุ
            <textarea name="rootCause" defaultValue={work.rootCause ?? ""} required placeholder="ระบุสาเหตุของปัญหา" className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)] outline-none focus:border-[var(--primary)]" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            วิธีการแก้ไข
          <textarea
            name="correctiveAction"
            defaultValue={work.correctiveAction ?? ""}
            required
            placeholder="ระบุวิธีการแก้ไข"
            className="min-h-20 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)] outline-none focus:border-[var(--primary)]"
          />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            หมายเหตุ
            <textarea name="workNote" defaultValue={work.workNote ?? ""} placeholder="ระบุหมายเหตุเพิ่มเติม" className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)] outline-none focus:border-[var(--primary)]" />
          </label>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]">
            <Check size={18} />
            ส่งปิดงาน
          </button>
        </form>
      ) : null}

      {canRelease ? (
          <form action={releaseAction} className="work-compact-form mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
          <input name="reason" required placeholder="เหตุผลปล่อยคืนคิว" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-slate-900 outline-none placeholder:text-slate-500 focus:border-[var(--primary)]" />
          <button className="inline-flex min-h-12 min-w-36 items-center justify-center rounded-xl border border-[var(--line)] px-5 font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]">ปล่อยงานคืนคิว</button>
        </form>
      ) : null}

      {canMoveToBacklogShutdown ? (
        <form action={moveToBacklogShutdownAction} className="work-compact-form mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
          <input name="targetStatus" type="hidden" value="BACKLOG_SHUTDOWN" />
          <input name="reason" required placeholder="เหตุผลย้ายเข้า Backlog Shutdown" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-slate-900 outline-none placeholder:text-slate-500 focus:border-[var(--primary)]" />
          <button className="inline-flex min-h-12 min-w-36 items-center justify-center rounded-xl bg-slate-700 px-5 font-bold text-white transition hover:bg-slate-800">ย้ายเข้า Backlog Shutdown</button>
        </form>
      ) : null}

      {shouldUpdateProgress ? (
        <form action={progressUpdateAction} className="mt-6 grid gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-slate-900 shadow-[var(--shadow)] dark:border-amber-300 dark:bg-amber-50 dark:text-slate-900">
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wide text-amber-800">Progress Update</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">อัปเดตงาน</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">งานนี้ไม่มีการอัปเดตหรือดำเนินการมาแล้ว 7 วัน กรุณาบันทึกความคืบหน้าเพื่อให้ทีมเห็นสถานะล่าสุด</p>
          </div>
          <textarea name="progressNote" required placeholder="บันทึกความคืบหน้า เช่น รออะไหล่, ตรวจสอบหน้างานแล้ว, นัดหยุดเครื่องเพื่อซ่อม" className="min-h-28 rounded-xl border border-amber-300 bg-white p-3 text-slate-900 outline-none placeholder:text-slate-500 focus:border-amber-600" />
          <button className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-600 px-5 font-bold text-white shadow-sm transition hover:bg-amber-700 sm:w-fit sm:min-w-44">บันทึกอัปเดตงาน</button>
        </form>
      ) : null}

      {canReview ? (
        <section className="mt-6 grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">Technician Work Summary</p>
            <h2 className="mt-1 text-xl font-bold">รายละเอียดที่ช่างบันทึกก่อนตรวจรับ</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              ใช้ข้อมูลส่วนนี้ประกอบการตัดสินใจก่อนปิดงานหรือส่งกลับให้แก้ไข
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ReviewDetail label="สาเหตุ" value={work.rootCause} />
            <ReviewDetail label="วิธีการแก้ไข" value={work.correctiveAction} />
            <ReviewDetail label="หมายเหตุช่าง" value={work.workNote} />
          </div>
          <div className="grid gap-3 rounded-2xl bg-[var(--soft)] p-4 text-sm md:grid-cols-2">
            <p>
              <strong>ผู้ดำเนินการ:</strong> {work.claimant?.fullName ?? "-"}
            </p>
            <p>
              <strong>วันที่ส่งรอตรวจรับ:</strong> {work.waitingToCloseAt ? formatThaiDateTime(work.waitingToCloseAt) : "-"}
            </p>
          </div>
        </section>
      ) : null}

      {canReview ? (
        <section className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-xl font-semibold">Engineer Review · ตรวจรับวิศวกร</h2>
          <form action={closeAction} className="grid gap-3">
            <textarea name="engineerNote" placeholder="หมายเหตุวิศวกร" className="rounded-md border p-3 text-black" />
            <button className="w-fit rounded-md bg-green-700 px-4 py-2 text-white">ปิดงาน</button>
          </form>
          <form action={returnAction} className="flex flex-wrap gap-3">
            <input name="reason" required placeholder="เหตุผลส่งกลับให้แก้ไข" className="min-w-0 flex-1 rounded-md border p-3 text-black sm:min-w-72" />
            <button className="w-full rounded-md border border-[var(--line)] px-4 py-2 sm:w-auto">ส่งกลับให้แก้ไข</button>
          </form>
        </section>
      ) : null}

      {canCancel ? (
         <form action={cancelAction} className="work-compact-form mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch">
          <input name="reason" required placeholder="เหตุผลยกเลิก" className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white px-4 text-slate-900 outline-none placeholder:text-slate-500 focus:border-red-500" />
          <button className="inline-flex min-h-12 min-w-36 items-center justify-center rounded-xl bg-red-700 px-5 font-bold text-white transition hover:bg-red-800">ยกเลิกงาน</button>
        </form>
      ) : null}

          <section className="work-audit-timeline mt-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-xl font-extrabold">
              <History className="text-[var(--primary)]" size={22} />
              ประวัติสถานะ
            </h2>
            <div className="mt-5 grid gap-0">
              {work.statusHistory.map((event, index) => (
                <WorkStatusTimelineRow
                  active={index === work.statusHistory.length - 1}
                  actor={event.changedById
                    ? (statusActorNameById.get(event.changedById) ?? "ผู้ใช้งาน")
                    : event.toStatus === WorkStatus.NEW
                      ? work.requesterName
                      : "ระบบ"}
                  key={event.id}
                  note={event.note ?? technicianCompletionTimelineNote(event.toStatus, work)}
                  time={event.changedAt}
                  title={statusLabels[event.toStatus as WorkStatus] ?? event.toStatus}
                />
              ))}
            </div>
          </section>

        </section>
        <StoreIssuePanel
          cancelOwnPendingStoreIssueAction={cancelOwnPendingStoreIssueAction}
          currentUserId={user.id}
          storeIssues={storeIssues}
        />
        </div>
      </div>

    </>
  );
}
