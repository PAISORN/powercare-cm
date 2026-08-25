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
  type LucideIcon,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { StatusBadge } from "../../../components/status-badge";
import { IssueRequestForm } from "../../../components/store/issue-request-form";
import { WorkAssignmentForm } from "../../../components/work-assignment-form";
import { db } from "../../../lib/db";
import { formatThaiDateTime } from "../../../lib/date-time/bangkok-time";
import { requireUser } from "../../../lib/session";
import { reasonSchema, workCompletionSchema } from "../../../lib/validation";
import { canAssignWork, canCancelWork, canClaimWork, canCloseWork } from "../../../modules/auth/permission";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import {
  assignWork,
  cancelWork,
  claimWork,
  closeWork,
  moveToInProgress,
  moveToBacklogShutdown,
  releaseWork,
  returnForCorrection,
  submitForReview,
} from "../../../modules/cm-work/cm-work-service";
import { canEnterBacklogShutdown } from "../../../modules/cm-work/cm-work-state-machine";
import { RoleName, WorkStatus, statusLabels, urgencyLabels, type Actor, type Urgency } from "../../../modules/cm-work/cm-work-types";
import { needsProgressUpdateReminder } from "../../../modules/cm-work/progress-update-reminder";
import { buildUserOperationalScope, type OperationalScope } from "../../../modules/organization/user-plant-scope";
import { readEngineerAssignmentSetting } from "../../../modules/settings/system-settings-service";
import { createLoggedInStoreIssue } from "../../../modules/store/store-issue-prisma";
import { StoreIssueStatus } from "../../../modules/store/store-types";

const pendingStoreIssueStatuses = [
  StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
  StoreIssueStatus.RETURNED_FOR_EDIT,
  StoreIssueStatus.WAITING_STORE_ISSUE,
  StoreIssueStatus.PARTIALLY_ISSUED,
  StoreIssueStatus.NOT_ENOUGH_STOCK,
];

async function getActor(): Promise<Actor> {
  const user = await requireUser();
  return {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };
}

export default async function WorkDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ assignmentError?: string; storeIssueBlocked?: string; storeIssueCreated?: string; storeIssueError?: string; workspaceTab?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const scope = buildUserOperationalScope(user);
  const [work, query] = await Promise.all([
    db.cmWork.findFirstOrThrow({
      where: { id, ...buildWorkScopeWhere(scope) },
      include: {
        organization: { select: { name: true } },
        plant: { select: { name: true, code: true } },
        category: true,
        zone: true,
        claimant: true,
        reviewer: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    }),
    searchParams,
  ]);
  if (!work.organizationId || !work.plantId) redirect("/dashboardcm");
  const statusActorIds = [...new Set(work.statusHistory
    .map((event) => event.changedById)
    .filter((actorId): actorId is string => Boolean(actorId)))];
  const statusActors = statusActorIds.length
    ? await db.user.findMany({
      where: { id: { in: statusActorIds } },
      select: { id: true, fullName: true },
    })
    : [];
  const statusActorNameById = new Map(statusActors.map((statusActor) => [statusActor.id, statusActor.fullName]));
  const workOrganizationId = work.organizationId;
  const workPlantId = work.plantId;
  const engineerAssignmentEnabled = await readEngineerAssignmentSetting(workPlantId);
  const storeIssues = await db.sparePartIssue.findMany({
    where: { cmWorkId: work.id, organizationId: workOrganizationId, plantId: workPlantId },
    select: {
      id: true,
      number: true,
      status: true,
      requestedAt: true,
      requesterUserId: true,
      items: {
        include: {
          store: { select: { code: true, name: true } },
          sparePart: { select: { code: true, name: true, unit: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
  const storeStocks = await db.storeStock.findMany({
    where: { plantId: workPlantId, organizationId: workOrganizationId, quantity: { gt: 0 }, store: { active: true }, sparePart: { active: true } },
    include: {
      store: { select: { id: true, code: true, name: true, category: { select: { name: true } } } },
      sparePart: {
        select: {
          id: true,
          code: true,
          itemKind: true,
          itemCode: true,
          name: true,
          unit: true,
          minStock: true,
          category: { select: { name: true } },
          materialGroup: { select: { name: true } },
        },
      },
    },
    orderBy: [{ store: { name: "asc" } }, { sparePart: { name: "asc" } }],
  });
  const issueZones = await db.storeApplicableZone.findMany({
    where: { plantId: workPlantId, active: true, zone: { active: true } },
    select: { code: true, zone: { select: { id: true, name: true } } },
    orderBy: { code: "asc" },
  });
  const actor: Actor = {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    categoryIds: user.categories.map((category) => category.categoryId),
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };

  async function claimAction() {
    "use server";
    await claimWork(await getActor(), id);
    redirect(`/work/${id}`);
  }

  async function assignAction(formData: FormData) {
    "use server";
    const technicianId = String(formData.get("technicianId") ?? "").trim();
    if (!technicianId) redirect(`/work/${id}?assignmentError=1`);
    try {
      await assignWork(await getActor(), id, technicianId);
    } catch {
      redirect(`/work/${id}?assignmentError=1`);
    }
    redirect(`/work/${id}`);
  }

  async function startAction() {
    "use server";
    await moveToInProgress(await getActor(), id);
    redirect(`/work/${id}`);
  }

  async function submitReviewAction(formData: FormData) {
    "use server";
    const pendingCount = await db.sparePartIssue.count({
      where: { cmWorkId: id, status: { in: pendingStoreIssueStatuses } },
    });
    const hasPendingStoreIssues = pendingCount > 0;
    if (hasPendingStoreIssues) redirect(`/work/${id}?storeIssueBlocked=1`);
    const parsed = workCompletionSchema.parse({
      rootCause: formData.get("rootCause"),
      correctiveAction: formData.get("correctiveAction"),
      workNote: formData.get("workNote"),
    });
    await submitForReview(await getActor(), id, parsed);
    redirect(`/work/${id}`);
  }

  async function releaseAction(formData: FormData) {
    "use server";
    const parsed = reasonSchema.parse({ reason: formData.get("reason") });
    await releaseWork(await getActor(), id, parsed.reason);
    redirect(`/work/${id}`);
  }

  async function moveToBacklogShutdownAction(formData: FormData) {
    "use server";
    const parsed = reasonSchema.parse({ reason: formData.get("reason") });
    await moveToBacklogShutdown(await getActor(), id, parsed.reason);
    redirect(`/work/${id}`);
  }

  async function returnAction(formData: FormData) {
    "use server";
    const parsed = reasonSchema.parse({ reason: formData.get("reason") });
    await returnForCorrection(await getActor(), id, parsed.reason);
    redirect(`/work/${id}`);
  }

  async function closeAction(formData: FormData) {
    "use server";
    await closeWork(await getActor(), id, String(formData.get("engineerNote") ?? ""));
    redirect(`/work/${id}`);
  }

  async function cancelAction(formData: FormData) {
    "use server";
    const parsed = reasonSchema.parse({ reason: formData.get("reason") });
    await cancelWork(await getActor(), id, parsed.reason);
    redirect(`/work/${id}`);
  }

  async function progressUpdateAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const actor = await getActor();
    const note = String(formData.get("progressNote") ?? "").trim();
    if (!note) redirect(`/work/${id}`);

    const actionScope = buildUserOperationalScope(currentUser);
    const currentWork = await db.cmWork.findFirstOrThrow({
      where: { id, claimantId: actor.id, ...buildWorkScopeWhere(actionScope) },
    });
    if (currentWork.status !== WorkStatus.CLAIMED && currentWork.status !== WorkStatus.IN_PROGRESS) redirect(`/work/${id}`);

    await db.$transaction([
      db.statusHistory.create({
        data: {
          cmWorkId: id,
          fromStatus: currentWork.status,
          toStatus: currentWork.status,
          changedById: actor.id,
          note,
        },
      }),
      db.auditEvent.create({
        data: {
          cmWorkId: id,
          actorId: actor.id,
          organizationId: currentUser.organizationId,
          plantId: currentWork.plantId,
          entityType: "CmWork",
          entityId: id,
          action: "UPDATE_WORK_PROGRESS",
          afterJson: JSON.stringify({ status: currentWork.status, note }),
        },
      }),
    ]);
    revalidatePath(`/work/${id}`);
    redirect(`/work/${id}`);
  }

  async function createWorkStoreIssueAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const actor = await getActor();
    const actionScope = buildUserOperationalScope(currentUser);
    const currentWork = await db.cmWork.findFirstOrThrow({
      where: { id, claimantId: actor.id, ...buildWorkScopeWhere(actionScope) },
      select: {
        id: true,
        number: true,
        status: true,
        organizationId: true,
        plantId: true,
        machineName: true,
        problemTitle: true,
      },
    });
    if (!currentWork.organizationId || !currentWork.plantId) redirect(`/work/${id}?storeIssueError=site-scope`);
    const currentPlant = await db.plant.findUniqueOrThrow({
      where: { id: currentWork.plantId },
      select: { inventoryCode: true },
    });
    if (
      currentWork.status !== WorkStatus.CLAIMED &&
      currentWork.status !== WorkStatus.IN_PROGRESS &&
      currentWork.status !== WorkStatus.RETURNED_FOR_CORRECTION
    ) {
      redirect(`/work/${id}?storeIssueError=work-status`);
    }

    const stockKeys = formData.getAll("stockKey").map(String);
    const zoneIds = formData.getAll("zoneId").map(String);
    const quantities = formData.getAll("requestedQty").map(Number);
    const items = stockKeys
      .map((stockKey, index) => {
        const [storeId, sparePartId] = stockKey.split(":");
        return { storeId, sparePartId, zoneId: zoneIds[index], requestedQty: quantities[index] };
      })
      .filter((item) => item.storeId && item.sparePartId && Number.isFinite(item.requestedQty) && item.requestedQty > 0);

    let createdNumber: string | null = null;
    let actionError: string | null = null;
    try {
      const created = await createLoggedInStoreIssue(
        currentUser,
        {
          organizationId: currentWork.organizationId,
          plantId: currentWork.plantId,
          plantCode: currentPlant.inventoryCode ?? "",
        },
        {
          issueType: "CM_REFERENCED",
          cmWorkNumber: currentWork.number,
          requesterName: currentUser.fullName,
          note: optionalText(formData.get("note")) ?? `Request from ${currentWork.number}`,
          requestedAt: new Date(),
          submissionKey: optionalText(formData.get("submissionKey")),
          items,
        },
      );
      createdNumber = created.number;
      await db.auditEvent.create({
        data: {
          cmWorkId: currentWork.id,
          actorId: currentUser.id,
          organizationId: currentWork.organizationId,
          plantId: currentWork.plantId,
          entityType: "SparePartIssue",
          entityId: created.id,
          action: "STORE_ISSUE_FROM_WORK_DETAIL",
          afterJson: JSON.stringify({ number: created.number, cmWorkNumber: currentWork.number, itemCount: items.length }),
        },
      });
    } catch (error) {
      actionError = storeActionError(error);
    }

    redirect(`/work/${id}${createdNumber ? `?storeIssueCreated=${createdNumber}` : `?storeIssueError=${encodeURIComponent(actionError ?? "Unknown error")}`}`);
  }

  async function cancelOwnPendingStoreIssueAction(formData: FormData) {
    "use server";
    const currentUser = await requireUser();
    const issueId = String(formData.get("issueId") ?? "").trim();
    if (!issueId) redirect(`/work/${id}`);

    const actionScope = buildUserOperationalScope(currentUser);
    const currentWork = await db.cmWork.findFirstOrThrow({
      where: { id, ...buildWorkScopeWhere(actionScope) },
      select: { id: true, organizationId: true, plantId: true },
    });
    if (!currentWork.organizationId || !currentWork.plantId) redirect(`/work/${id}`);

    const issue = await db.sparePartIssue.findFirst({
      where: {
        id: issueId,
        cmWorkId: currentWork.id,
        organizationId: currentWork.organizationId,
        plantId: currentWork.plantId,
        requesterUserId: currentUser.id,
        status: StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
      },
      select: { id: true, number: true },
    });
    if (!issue) redirect(`/work/${id}?storeIssueError=cannot-cancel`);

    await db.$transaction([
      db.auditEvent.create({
        data: {
          cmWorkId: currentWork.id,
          actorId: currentUser.id,
          organizationId: currentWork.organizationId,
          plantId: currentWork.plantId,
          entityType: "SparePartIssue",
          entityId: issue.id,
          action: "CANCEL_PENDING_STORE_ISSUE",
          afterJson: JSON.stringify({ number: issue.number }),
        },
      }),
      db.sparePartIssue.delete({ where: { id: issue.id } }),
    ]);
    revalidatePath(`/work/${id}`);
    redirect(`/work/${id}`);
  }

  const isClaimant = work.claimantId === user.id;
  const canReview = canCloseWork(actor, work);
  const canCancel = canCancelWork(actor, work);
  const canMoveToBacklogShutdown = canCancel && canEnterBacklogShutdown(work.status, work.claimant?.role);
  const canRelease = isClaimant && (work.status === WorkStatus.CLAIMED || work.status === WorkStatus.IN_PROGRESS);
  const hasPendingStoreIssues = storeIssues.some((issue) =>
    pendingStoreIssueStatuses.includes(issue.status as (typeof pendingStoreIssueStatuses)[number]),
  );
  const canSubmit =
    isClaimant && !hasPendingStoreIssues && (work.status === WorkStatus.IN_PROGRESS || work.status === WorkStatus.RETURNED_FOR_CORRECTION);
  const canRequestStoreIssue =
    isClaimant &&
    canUseUserPermission(user, PermissionKey.CREATE_STORE_ISSUE) &&
    (work.status === WorkStatus.CLAIMED || work.status === WorkStatus.IN_PROGRESS || work.status === WorkStatus.RETURNED_FOR_CORRECTION);
  const latestWorkActivityAt = work.statusHistory.at(-1)?.changedAt ?? null;
  const shouldUpdateProgress = isClaimant && needsProgressUpdateReminder(work, latestWorkActivityAt);
  const mayAssign = canAssignWork(actor, work, engineerAssignmentEnabled);
  const workspaceTab = query.workspaceTab === "issue" ? "issue" : "operations";
  const technicians = mayAssign
    ? await db.user.findMany({
        where: {
          active: true,
          role: RoleName.TECHNICIAN,
          plantId: work.plantId,
          OR: [{ categoryId: work.categoryId }, { categories: { some: { categoryId: work.categoryId } } }],
        },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true },
      })
    : [];

  return (
    <AppShell>
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
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]" href={`/work/${work.id}/print`}>
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
            <input name="reason" required placeholder="เหตุผลส่งกลับให้แก้ไข" className="min-w-72 rounded-md border p-3 text-black" />
            <button className="rounded-md border border-[var(--line)] px-4 py-2">ส่งกลับให้แก้ไข</button>
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

    </AppShell>
  );
}

function WorkMetaItem({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-start gap-3 border-[var(--line)] px-4 py-4 sm:px-5 ${wide ? "sm:col-span-2 xl:col-span-2" : ""}`}>
      <Icon aria-hidden="true" className="shrink-0 text-[var(--primary)]" size={22} />
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
        <p className={`mt-1 font-semibold leading-relaxed text-[var(--ink)] ${wide ? "line-clamp-2" : "truncate"}`}>{value || "-"}</p>
      </div>
    </div>
  );
}

function ReviewDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl bg-[var(--soft)] p-4">
      <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
      <p className="mt-2 whitespace-pre-wrap font-semibold">{value?.trim() || "-"}</p>
    </div>
  );
}

function technicianCompletionTimelineNote(
  status: string,
  work: { rootCause: string | null; correctiveAction: string | null; workNote: string | null },
) {
  if (status !== WorkStatus.WAITING_TO_CLOSE) return null;
  const details = [
    work.rootCause?.trim() ? `สาเหตุ: ${work.rootCause.trim()}` : null,
    work.correctiveAction?.trim() ? `วิธีการแก้ไข: ${work.correctiveAction.trim()}` : null,
    work.workNote?.trim() ? `หมายเหตุช่าง: ${work.workNote.trim()}` : null,
  ].filter(Boolean);
  return details.length ? details.join("\n") : null;
}

function WorkStatusTimelineRow({
  active,
  actor,
  note,
  time,
  title,
}: {
  active: boolean;
  actor: string;
  note?: string | null;
  time: Date;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <div className="grid justify-center">
        <span className={active ? "mt-1 h-4 w-4 rounded-full bg-emerald-500" : "mt-1 h-4 w-4 rounded-full border-2 border-emerald-500 bg-[var(--surface)]"} />
        <span className="mx-auto h-full min-h-10 w-0.5 bg-emerald-500/45" />
      </div>
      <div className="pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{title}</strong>
          <span className="text-sm text-[var(--muted)]">{formatThaiDateTime(time)}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">โดย {actor}</p>
        {note ? <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">{note}</p> : null}
      </div>
    </div>
  );
}

type StoreIssueForWork = {
  id: string;
  number: string;
  status: string;
  requestedAt: Date;
  requesterUserId: string | null;
  items: Array<{
    id: string;
    requestedQty: unknown;
    approvedQty: unknown;
    issuedQty: unknown;
    store: { code: string; name: string } | null;
    sparePart: { code: string; name: string; unit: string };
  }>;
};

function StoreIssuePanel({
  cancelOwnPendingStoreIssueAction,
  currentUserId,
  storeIssues,
}: {
  cancelOwnPendingStoreIssueAction: (formData: FormData) => Promise<void>;
  currentUserId: string;
  storeIssues: StoreIssueForWork[];
}) {
  if (!storeIssues.length) return null;
  return (
    <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--primary)]">Store / Spare Parts</p>
          <h2 className="mt-1 text-xl font-bold">ใบเบิกอะไหล่ที่ผูกกับงานนี้</h2>
        </div>
        <Link className="rounded-full border border-[var(--line)] px-3 py-1.5 text-sm font-bold text-[var(--primary)]" href="/dashboardstore/tracking">
          ติดตามทั้งหมด
        </Link>
      </div>
      <div className="mt-4 grid gap-3">
        {storeIssues.map((issue) => (
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4" key={issue.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-extrabold">{issue.number}</p>
                <p className="text-sm text-[var(--muted)]">{formatThaiDateTime(issue.requestedAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StoreIssueStatusBadge status={issue.status} />
                {issue.status === StoreIssueStatus.WAITING_ENGINEER_APPROVAL && issue.requesterUserId === currentUserId ? (
                  <form action={cancelOwnPendingStoreIssueAction}>
                    <input type="hidden" name="issueId" value={issue.id} />
                    <button className="rounded-full border border-red-300 px-3 py-1 text-xs font-extrabold text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10">
                      ยกเลิกใบเบิก
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              {issue.items.map((item) => (
                <div className="grid gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={item.id}>
                  <p className="truncate font-bold">
                    {item.sparePart.code} · {item.sparePart.name}
                    <span className="ml-2 font-normal text-[var(--muted)]">{item.store?.code ?? "-"}</span>
                  </p>
                  <p className="font-bold">
                    จ่ายแล้ว {formatQty(Number(item.issuedQty ?? 0))} / {formatQty(Number(item.approvedQty ?? item.requestedQty))} {item.sparePart.unit}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StoreIssueStatusBadge({ status }: { status: string }) {
  const labelMap: Record<string, string> = {
    [StoreIssueStatus.WAITING_ENGINEER_APPROVAL]: "รอ Engineer อนุมัติ",
    [StoreIssueStatus.RETURNED_FOR_EDIT]: "ส่งกลับให้แก้ไข",
    [StoreIssueStatus.WAITING_STORE_ISSUE]: "รอ Store จ่ายของ",
    [StoreIssueStatus.PARTIALLY_ISSUED]: "จ่ายบางส่วน",
    [StoreIssueStatus.NOT_ENOUGH_STOCK]: "ของไม่พอ",
    [StoreIssueStatus.ISSUED]: "จ่ายแล้ว",
    [StoreIssueStatus.ENGINEER_REJECTED]: "Engineer ไม่อนุมัติ",
    [StoreIssueStatus.STORE_REJECTED]: "Store ไม่อนุมัติ",
    [StoreIssueStatus.CANCELED]: "ยกเลิก",
  };
  const isDone = status === StoreIssueStatus.ISSUED;
  const badStatuses = [
    StoreIssueStatus.NOT_ENOUGH_STOCK,
    StoreIssueStatus.ENGINEER_REJECTED,
    StoreIssueStatus.STORE_REJECTED,
    StoreIssueStatus.CANCELED,
  ] as string[];
  const isBad = badStatuses.includes(status);
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-extrabold ${
        isDone
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : isBad
            ? "bg-red-500/15 text-red-700 dark:text-red-300"
            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      }`}
    >
      {labelMap[status] ?? status}
    </span>
  );
}

function formatQty(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function storeActionError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function buildStoreStockStatus(quantity: number, minStock: number) {
  if (quantity <= 0) return "OUT";
  if (quantity <= minStock) return "LOW";
  return "ENOUGH";
}

function buildWorkScopeWhere(scope?: OperationalScope) {
  if (scope?.plantId) return { plantId: scope.plantId };
  if (scope?.organizationId) return { organizationId: scope.organizationId };
  return {};
}

