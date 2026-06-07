import { redirect } from "next/navigation";
import { SignaturePreview } from "../../components/signature-preview";
import { db } from "../../lib/db";
import { saveSignatureFile } from "../../lib/file-storage";
import { requireUser } from "../../lib/session";
import { RoleName } from "../../modules/cm-work/cm-work-types";

async function uploadSignature(formData: FormData) {
  "use server";
  const user = await requireUser();
  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) redirect("/profile?error=missing-file");

  const saved = await saveSignatureFile(user.id, file);
  await db.signature.upsert({
    where: { userId: user.id },
    update: saved,
    create: { userId: user.id, ...saved },
  });
  redirect("/profile?uploaded=1");
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ uploaded?: string; error?: string }> }) {
  const user = await requireUser();
  const { uploaded, error } = await searchParams;

  return (
    <main className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-3xl font-bold">My Profile</h1>
      {uploaded ? <p className="mt-4 text-green-700">บันทึกลายเซ็นแล้ว</p> : null}
      {error ? <p className="mt-4 text-red-700">ไม่สามารถอัปโหลดไฟล์ได้</p> : null}
      <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <p>
          <strong>ชื่อ:</strong> {user.fullName}
        </p>
        <p>
          <strong>Role:</strong> {user.role}
        </p>
        <p>
          <strong>Category:</strong> {user.category?.name ?? "-"}
        </p>
        <p>
          <strong>ลายเซ็น:</strong> {user.signature ? "มีลายเซ็นแล้ว" : "ยังไม่มีลายเซ็น"}
        </p>
      </section>
      {user.role !== RoleName.ADMIN ? (
        <form action={uploadSignature} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
          <label className="font-semibold">อัปโหลดลายเซ็น PNG/JPG ไม่เกิน 2 MB</label>
          <SignaturePreview />
          <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">บันทึกลายเซ็น</button>
        </form>
      ) : null}
    </main>
  );
}
