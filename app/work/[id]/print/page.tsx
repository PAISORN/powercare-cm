import { notFound } from "next/navigation";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/session";
import { canRenderCompletionDocument } from "../../../../modules/documents/completion-document";

export default async function PrintCompletionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const work = await db.cmWork.findUnique({
    where: { id },
    include: {
      category: true,
      zone: true,
      claimant: { include: { signature: true } },
      reviewer: { include: { signature: true } },
    },
  });

  if (!work || !canRenderCompletionDocument(work.status)) notFound();

  return (
    <main className="mx-auto max-w-4xl bg-white p-10 text-black print:p-0">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">ใบสรุปปิดงาน Corrective Maintenance</h1>
        <p className="mt-2">Power Plant CM Control Center</p>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <p>
          <strong>เลขที่แจ้งซ่อม:</strong> {work.number}
        </p>
        <p>
          <strong>สถานะ:</strong> ปิดงานแล้ว
        </p>
        <p>
          <strong>วันที่แจ้ง:</strong> {work.createdAt.toLocaleString("th-TH")}
        </p>
        <p>
          <strong>วันที่รับเรื่อง:</strong> {work.claimedAt?.toLocaleString("th-TH") ?? "-"}
        </p>
        <p>
          <strong>วันที่ปิดงาน:</strong> {work.closedAt?.toLocaleString("th-TH") ?? "-"}
        </p>
      </section>

      <hr className="my-6" />

      <section className="grid gap-2">
        <p>
          <strong>ผู้แจ้ง:</strong> {work.requesterName}
        </p>
        <p>
          <strong>หน่วยงาน:</strong> {work.requesterDepartment}
        </p>
        <p>
          <strong>Category:</strong> {work.category.name}
        </p>
        <p>
          <strong>Zone:</strong> {work.zone.name}
        </p>
        <p>
          <strong>ชื่อเครื่องจักร:</strong> {work.machineName}
        </p>
        <p>
          <strong>หัวข้อปัญหา:</strong> {work.problemTitle}
        </p>
        <p>
          <strong>รายละเอียด:</strong> {work.problemDetail}
        </p>
      </section>

      <hr className="my-6" />

      <section className="grid gap-2">
        <p>
          <strong>สาเหตุ:</strong> {work.rootCause ?? "-"}
        </p>
        <p>
          <strong>วิธีการแก้ไข:</strong> {work.correctiveAction ?? "-"}
        </p>
        <p>
          <strong>หมายเหตุวิศวกร:</strong> {work.engineerNote ?? "-"}
        </p>
      </section>

      <div className="mt-16 grid grid-cols-2 gap-12">
        <div className="text-center">
          <div className="flex h-28 items-center justify-center border-b">
            {work.claimant?.signature ? <img alt="Technician signature" className="max-h-24 object-contain" src={`/signatures/${work.claimant.id}`} /> : null}
          </div>
          <p className="mt-2">ผู้ดำเนินการ: {work.claimant?.fullName ?? "-"}</p>
        </div>
        <div className="text-center">
          <div className="flex h-28 items-center justify-center border-b">
            {work.reviewer?.signature ? <img alt="Engineer signature" className="max-h-24 object-contain" src={`/signatures/${work.reviewer.id}`} /> : null}
          </div>
          <p className="mt-2">ผู้ตรวจรับ: {work.reviewer?.fullName ?? "-"}</p>
        </div>
      </div>
    </main>
  );
}
