import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { StatusBadge } from "../../../components/status-badge";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { reasonSchema, workCompletionSchema } from "../../../lib/validation";
import { canCancelWork, canClaimWork, canCloseWork } from "../../../modules/auth/permission";
import {
  cancelWork,
  claimWork,
  closeWork,
  moveToInProgress,
  releaseWork,
  returnForCorrection,
  submitForReview,
} from "../../../modules/cm-work/cm-work-service";
import { RoleName, WorkStatus, statusLabels, urgencyLabels, type Actor, type Urgency } from "../../../modules/cm-work/cm-work-types";

async function getActor(): Promise<Actor> {
  const user = await requireUser();
  return { id: user.id, role: user.role as Actor["role"], categoryId: user.categoryId };
}

export default async function WorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const work = await db.cmWork.findUniqueOrThrow({
    where: { id },
    include: { category: true, zone: true, claimant: true, reviewer: true, statusHistory: true, auditEvents: true },
  });
  const actor: Actor = { id: user.id, role: user.role as Actor["role"], categoryId: user.categoryId };

  async function claimAction() {
    "use server";
    await claimWork(await getActor(), id);
    redirect(`/work/${id}`);
  }

  async function startAction() {
    "use server";
    await moveToInProgress(await getActor(), id);
    redirect(`/work/${id}`);
  }

  async function submitReviewAction(formData: FormData) {
    "use server";
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

  const isClaimant = work.claimantId === user.id;
  const canReview = canCloseWork(actor, work);
  const canCancel = canCancelWork(actor, work);
  const canRelease = isClaimant && (work.status === WorkStatus.CLAIMED || work.status === WorkStatus.IN_PROGRESS);
  const canSubmit = isClaimant && (work.status === WorkStatus.IN_PROGRESS || work.status === WorkStatus.RETURNED_FOR_CORRECTION);

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{work.number}</h1>
          <p className="text-[var(--muted)]">
            {work.machineName} · {work.category.name} · {work.zone.name}
          </p>
        </div>
        <StatusBadge status={work.status} />
      </div>

      <section className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <p>
          <strong>ผู้แจ้ง:</strong> {work.requesterName}
        </p>
        <p>
          <strong>หน่วยงาน:</strong> {work.requesterDepartment}
        </p>
        <p>
          <strong>ความเร่งด่วน:</strong> {urgencyLabels[work.urgency as Urgency]}
        </p>
        <p>
          <strong>หัวข้อ:</strong> {work.problemTitle}
        </p>
        <p>
          <strong>รายละเอียด:</strong> {work.problemDetail}
        </p>
        <p>
          <strong>ผู้รับงาน:</strong> {work.claimant?.fullName ?? "-"}
        </p>
        <p>
          <strong>สถานะ:</strong> {statusLabels[work.status as keyof typeof statusLabels] ?? work.status}
        </p>
      </section>

      <section className="mt-6 flex flex-wrap gap-3">
        {canClaimWork(actor, work) ? (
          <form action={claimAction}>
            <button className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]">
              รับงาน
            </button>
          </form>
        ) : null}
        {isClaimant && work.status === WorkStatus.CLAIMED ? (
          <form action={startAction}>
            <button className="rounded-md border border-[var(--line)] px-4 py-2">เริ่มดำเนินการ</button>
          </form>
        ) : null}
        {work.status === WorkStatus.CLOSED ? (
          <Link className="rounded-md border border-[var(--line)] px-4 py-2" href={`/work/${work.id}/print`}>
            พิมพ์เอกสาร
          </Link>
        ) : null}
      </section>

      {canSubmit ? (
        <form action={submitReviewAction} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-xl font-semibold">บันทึกช่าง</h2>
          <textarea name="rootCause" defaultValue={work.rootCause ?? ""} required placeholder="สาเหตุ" className="rounded-md border p-3 text-black" />
          <textarea
            name="correctiveAction"
            defaultValue={work.correctiveAction ?? ""}
            required
            placeholder="วิธีการแก้ไข"
            className="rounded-md border p-3 text-black"
          />
          <textarea name="workNote" defaultValue={work.workNote ?? ""} placeholder="หมายเหตุ" className="rounded-md border p-3 text-black" />
          <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">ส่งรอปิดงาน</button>
        </form>
      ) : null}

      {canRelease ? (
        <form action={releaseAction} className="mt-6 flex flex-wrap gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <input name="reason" required placeholder="เหตุผลปล่อยคืนคิว" className="min-w-72 rounded-md border p-3 text-black" />
          <button className="rounded-md border border-[var(--line)] px-4 py-2">ปล่อยงานคืนคิว</button>
        </form>
      ) : null}

      {canReview ? (
        <section className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-xl font-semibold">ตรวจรับวิศวกร</h2>
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
        <form action={cancelAction} className="mt-6 flex flex-wrap gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <input name="reason" required placeholder="เหตุผลยกเลิก" className="min-w-72 rounded-md border p-3 text-black" />
          <button className="rounded-md bg-red-700 px-4 py-2 text-white">ยกเลิกงาน</button>
        </form>
      ) : null}

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold">Audit Trail</h2>
        <div className="mt-4 grid gap-2">
          {work.auditEvents.map((event) => (
            <div key={event.id} className="rounded-md border border-[var(--line)] p-3 text-sm">
              {event.action} · {event.createdAt.toLocaleString("th-TH")}
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
