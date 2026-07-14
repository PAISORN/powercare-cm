import { BadgeCheck, Camera, ClipboardList, IdCard, LockKeyhole, PenLine, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { ProfilePasswordForm } from "../../components/profile-password-form";
import { ProfilePhotoPreview } from "../../components/profile-photo-preview";
import { SignaturePreview } from "../../components/signature-preview";
import { UserAvatar } from "../../components/user-avatar";
import { db } from "../../lib/db";
import { deleteStoredFile, saveProfilePhotoFile, saveSignatureFile } from "../../lib/file-storage";
import { hashPassword, verifyPassword } from "../../lib/password";
import { cacheTags, revalidateCmData } from "../../lib/query-cache";
import { requireUser } from "../../lib/session";
import { recordAudit } from "../../modules/audit/audit-service";
import { RoleName } from "../../modules/cm-work/cm-work-types";
import { formatRoleName } from "../../modules/users/role-labels";

async function uploadProfilePhoto(formData: FormData) {
  "use server";
  const user = await requireUser();
  const file = formData.get("profilePhoto");
  if (!(file instanceof File) || file.size === 0) redirect("/profile?photoError=1");

  try {
    const saved = await saveProfilePhotoFile(user.id, file);
    const previousPath = user.profilePhoto?.storagePath;
    await db.profilePhoto.upsert({
      where: { userId: user.id },
      update: saved,
      create: { userId: user.id, ...saved },
    });

    if (previousPath && previousPath !== saved.storagePath) {
      await deleteStoredFile(previousPath);
    }
  } catch {
    redirect("/profile?photoError=1");
  }

  revalidateCmData([cacheTags.usersActive, cacheTags.dashboardSummary]);
  redirect("/profile?photoUploaded=1");
}

async function uploadSignature(formData: FormData) {
  "use server";
  const user = await requireUser();
  const file = formData.get("signature");
  if (!(file instanceof File) || file.size === 0) redirect("/profile?signatureError=1");

  try {
    const saved = await saveSignatureFile(user.id, file);
    await db.signature.upsert({
      where: { userId: user.id },
      update: saved,
      create: { userId: user.id, ...saved },
    });
  } catch {
    redirect("/profile?signatureError=1");
  }

  redirect("/profile?signatureUploaded=1");
}

async function changeOwnPassword(formData: FormData) {
  "use server";
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmNewPassword = String(formData.get("confirmNewPassword") ?? "");

  if (newPassword.length < 10) redirect("/profile?passwordError=length");
  if (newPassword !== confirmNewPassword) redirect("/profile?passwordError=match");

  const currentUser = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!currentUser) redirect("/login");

  const passwordOk = await verifyPassword(currentPassword, currentUser.passwordHash);
  if (!passwordOk) redirect("/profile?passwordError=current");

  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await recordAudit({
    actorId: user.id,
    entityType: "USER",
    entityId: user.id,
    action: "CHANGE_OWN_PASSWORD",
    after: { passwordChanged: true },
  });

  redirect("/profile?passwordChanged=1");
}

type ProfileSearchParams = {
  photoUploaded?: string;
  photoError?: string;
  signatureUploaded?: string;
  signatureError?: string;
  passwordChanged?: string;
  passwordError?: string;
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<ProfileSearchParams>;
}) {
  const user = await requireUser();
  const { photoUploaded, photoError, signatureUploaded, signatureError, passwordChanged, passwordError } = await searchParams;

  return (
    <AppShell>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
          <div className="profile-cover relative h-40 overflow-hidden bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300 sm:h-48">
            <div className="absolute inset-0 opacity-60" aria-hidden="true">
              <span className="absolute right-8 top-8 h-24 w-24 rounded-full bg-white/30 sm:h-28 sm:w-28" />
              <span className="absolute bottom-4 left-6 h-18 w-32 rounded-full bg-white/25 sm:left-12 sm:h-20 sm:w-44" />
              <span className="absolute bottom-8 right-28 h-14 w-14 rounded-full bg-sky-500/20 sm:right-40 sm:h-16 sm:w-16" />
            </div>
          </div>

          <div className="relative px-4 pb-6 sm:px-6 lg:px-8">
            <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4">
                <div className="rounded-full bg-white p-1 shadow-xl ring-4 ring-white">
                  <UserAvatar fullName={user.fullName} hasPhoto={Boolean(user.profilePhoto)} size="xl" userId={user.id} version={user.profilePhoto?.updatedAt.getTime()} />
                </div>
                <div className="min-w-0 pb-2 sm:pb-3">
                  <h1 className="text-2xl font-extrabold sm:text-3xl">{user.fullName}</h1>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">@{user.username}</p>
                </div>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-4 py-2 text-sm font-bold text-cyan-700 shadow-sm">
                <BadgeCheck size={17} />
                Profile settings
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <ProfileStat label="Role" value={formatRoleName(user.role)} />
              <ProfileStat label="Department" value={user.department || "-"} />
              <ProfileStat label="Category" value={user.category?.name ?? "-"} />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <form action={uploadProfilePhoto} className="rounded-3xl border border-[var(--line)] bg-[var(--soft)] p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-cyan-100 text-cyan-700">
                    <Camera size={21} />
                  </span>
                  <div>
                    <h2 className="font-extrabold">Profile Photo</h2>
                    <p className="text-sm text-[var(--muted)]">รองรับ PNG/JPG/WebP และระบบจะบันทึกรูปใหม่ทับของเดิมอัตโนมัติ</p>
                  </div>
                </div>
                <div className="mt-4">
                  <ProfilePhotoPreview />
                </div>
                <button className="mt-4 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-sm" type="submit">
                  บันทึกรูปโปรไฟล์
                </button>
              </form>

              {user.role !== RoleName.ADMIN ? (
                <form action={uploadSignature} className="rounded-3xl border border-[var(--line)] bg-[var(--soft)] p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-sky-100 text-sky-700">
                      <PenLine size={21} />
                    </span>
                    <div>
                      <h2 className="font-extrabold">Signature</h2>
                      <p className="text-sm text-[var(--muted)]">รองรับ PNG/JPG และใช้ในเอกสารปิดงานโดยดึงจากโปรไฟล์อัตโนมัติ</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <SignaturePreview />
                  </div>
                  <button className="mt-4 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-sm" type="submit">
                    บันทึกลายเซ็น
                  </button>
                </form>
              ) : (
                <section className="rounded-3xl border border-[var(--line)] bg-[var(--soft)] p-5">
                  <h2 className="font-extrabold">Admin Account</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">บัญชี Admin ใช้จัดการผู้ใช้งาน ประวัติการแก้ไข และข้อมูลหลังบ้านผ่านเมนู Admin</p>
                </section>
              )}
            </div>

            <section className="mt-5 rounded-3xl border border-[var(--line)] bg-[var(--soft)] p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-violet-100 text-violet-700">
                  <LockKeyhole size={20} />
                </span>
                <div>
                  <h2 className="font-extrabold">Password</h2>
                  <p className="text-sm text-[var(--muted)]">เปลี่ยนรหัสผ่านของบัญชีนี้ได้เองโดยต้องยืนยันรหัสผ่านปัจจุบันก่อน</p>
                </div>
              </div>

              <div className="mt-4">
                <ProfilePasswordForm action={changeOwnPassword} />
              </div>
            </section>
          </div>
        </main>

        <aside className="grid content-start gap-5">
          <StatusNotice
            success={Boolean(photoUploaded)}
            error={Boolean(photoError)}
            successText="บันทึกรูปโปรไฟล์แล้ว"
            errorText="ไม่สามารถอัปโหลดรูปโปรไฟล์ได้"
          />
          <StatusNotice
            success={Boolean(signatureUploaded)}
            error={Boolean(signatureError)}
            successText="บันทึกลายเซ็นแล้ว"
            errorText="ไม่สามารถอัปโหลดลายเซ็นได้"
          />
          <StatusNotice
            success={Boolean(passwordChanged)}
            error={Boolean(passwordError)}
            successText="เปลี่ยนรหัสผ่านแล้ว"
            errorText={getPasswordErrorText(passwordError)}
          />

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <IdCard size={20} className="text-[var(--primary)]" />
              Account Summary
            </h2>
            <div className="mt-4 grid gap-3 text-sm">
              <SummaryRow label="Username" value={user.username} />
              <SummaryRow label="Role" value={formatRoleName(user.role)} />
              <SummaryRow label="Department" value={user.department || "-"} />
              <SummaryRow label="Category" value={user.category?.name ?? "-"} />
              <SummaryRow label="Photo" value={user.profilePhoto ? "มีรูปโปรไฟล์แล้ว" : "ยังไม่มีรูปโปรไฟล์"} />
              <SummaryRow label="Signature" value={user.signature ? "มีลายเซ็นแล้ว" : "ยังไม่มีลายเซ็น"} />
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <ClipboardList size={20} className="text-[var(--primary)]" />
              Work Identity
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">รูปโปรไฟล์จะแสดงใน Work Results และหน้า Admin Users ส่วนลายเซ็นจะถูกดึงไปใช้ตอนพิมพ์เอกสารปิดงานโดยอัตโนมัติ</p>
          </section>

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <ShieldCheck size={20} className="text-[var(--primary)]" />
              Account Control
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">ชื่อ หน่วยงาน Role และ Category เป็นข้อมูลที่กำหนดตามสิทธิ์ของระบบ หากต้องการเปลี่ยนข้อมูลส่วนนี้ให้ติดต่อผู้ดูแลระบบ</p>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--soft)] px-4 py-3">
      <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
      <strong className="mt-1 block truncate">{value}</strong>
    </div>
  );
}

function StatusNotice({
  success,
  error,
  successText,
  errorText,
}: {
  success: boolean;
  error: boolean;
  successText: string;
  errorText: string;
}) {
  if (!success && !error) return null;

  return (
    <div className={success ? "rounded-3xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-700" : "rounded-3xl border border-red-200 bg-red-50 p-4 font-bold text-red-700"}>
      {success ? successText : errorText}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--soft)] px-3 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <strong className="truncate text-right">{value}</strong>
    </div>
  );
}

function getPasswordErrorText(code?: string) {
  if (code === "length") return "รหัสผ่านใหม่ต้องยาวอย่างน้อย 10 ตัวอักษร";
  if (code === "match") return "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน";
  if (code === "current") return "รหัสผ่านปัจจุบันไม่ถูกต้อง";
  return "ไม่สามารถเปลี่ยนรหัสผ่านได้";
}
