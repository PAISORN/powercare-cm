import { BadgeCheck, Camera, ClipboardList, IdCard, PenLine, Settings, ShieldCheck, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { ProfilePhotoPreview } from "../../components/profile-photo-preview";
import { SignaturePreview } from "../../components/signature-preview";
import { UserAvatar } from "../../components/user-avatar";
import { db } from "../../lib/db";
import { deleteStoredFile, saveProfilePhotoFile, saveSignatureFile } from "../../lib/file-storage";
import { requireUser } from "../../lib/session";
import { RoleName } from "../../modules/cm-work/cm-work-types";

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
    if (previousPath && previousPath !== saved.storagePath) await deleteStoredFile(previousPath);
  } catch {
    redirect("/profile?photoError=1");
  }

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

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ photoUploaded?: string; photoError?: string; signatureUploaded?: string; signatureError?: string }>;
}) {
  const user = await requireUser();
  const { photoUploaded, photoError, signatureUploaded, signatureError } = await searchParams;

  return (
    <AppShell>
      <section className="grid gap-6 xl:grid-cols-[280px_1fr_320px]">
        <aside className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
          <p className="text-sm font-semibold text-[var(--muted)]">Account Menu</p>
          <nav className="mt-5 grid gap-2">
            <ProfileNavItem active icon={<UserRound size={19} />} label="Profile" />
            <ProfileNavItem icon={<ShieldCheck size={19} />} label="Role & Permission" />
            <ProfileNavItem icon={<PenLine size={19} />} label="Signature" />
            <ProfileNavItem icon={<Settings size={19} />} label="Settings" />
          </nav>
        </aside>

        <main className="min-w-0 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
          <div className="profile-cover relative h-48 overflow-hidden bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-200">
            <div className="absolute inset-0 opacity-60" aria-hidden="true">
              <span className="absolute right-10 top-8 h-28 w-28 rounded-full bg-white/30" />
              <span className="absolute bottom-5 left-12 h-20 w-44 rounded-full bg-white/25" />
              <span className="absolute bottom-10 right-40 h-16 w-16 rounded-full bg-sky-500/20" />
            </div>
          </div>

          <div className="relative px-5 pb-6 md:px-8">
            <div className="-mt-20 flex flex-wrap items-end justify-between gap-4">
              <div className="flex min-w-0 items-end gap-4">
                <div className="rounded-full bg-white p-1 shadow-xl ring-4 ring-white">
                  <UserAvatar fullName={user.fullName} hasPhoto={Boolean(user.profilePhoto)} size="xl" userId={user.id} version={user.profilePhoto?.updatedAt.getTime()} />
                </div>
                <div className="min-w-0 pb-3">
                  <h1 className="text-3xl font-extrabold">{user.fullName}</h1>
                  <p className="mt-1 text-sm font-semibold text-[var(--muted)]">@{user.username}</p>
                </div>
              </div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/90 px-4 py-2 text-sm font-bold text-cyan-700 shadow-sm">
                <BadgeCheck size={17} />
                Profile settings
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <ProfileStat label="Role" value={user.role} />
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
                    <p className="text-sm text-[var(--muted)]">รองรับ PNG/JPG/WebP ไม่เกิน 5 MB และบันทึกไว้ในฐานข้อมูล</p>
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
                      <p className="text-sm text-[var(--muted)]">ใช้ในเอกสารปิดงาน</p>
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
                  <p className="mt-2 text-sm text-[var(--muted)]">บัญชี Admin จัดการ User, History และข้อมูลหลังบ้านผ่านเมนู Admin</p>
                </section>
              )}
            </div>
          </div>
        </main>

        <aside className="grid content-start gap-5">
          <StatusNotice success={Boolean(photoUploaded)} error={Boolean(photoError)} successText="บันทึกรูปโปรไฟล์แล้ว" errorText="ไม่สามารถอัปโหลดรูปโปรไฟล์ได้" />
          <StatusNotice success={Boolean(signatureUploaded)} error={Boolean(signatureError)} successText="บันทึกลายเซ็นแล้ว" errorText="ไม่สามารถอัปโหลดลายเซ็นได้" />

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <IdCard size={20} className="text-[var(--primary)]" />
              Account Summary
            </h2>
            <div className="mt-4 grid gap-3 text-sm">
              <SummaryRow label="Username" value={user.username} />
              <SummaryRow label="Photo" value={user.profilePhoto ? "มีรูปโปรไฟล์แล้ว" : "ยังไม่มีรูปโปรไฟล์"} />
              <SummaryRow label="Signature" value={user.signature ? "มีลายเซ็นแล้ว" : "ยังไม่มีลายเซ็น"} />
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <ClipboardList size={20} className="text-[var(--primary)]" />
              Work Identity
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)]">รูปโปรไฟล์นี้จะแสดงใน Work Results และหน้า Admin Users เพื่อระบุผู้รับงานได้เร็วขึ้น</p>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}

function ProfileNavItem({ active = false, icon, label }: { active?: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span className={active ? "flex items-center gap-3 rounded-2xl bg-cyan-50 px-4 py-3 font-bold text-cyan-700" : "flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-[var(--muted)]"}>
      {icon}
      {label}
    </span>
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

function StatusNotice({ success, error, successText, errorText }: { success: boolean; error: boolean; successText: string; errorText: string }) {
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
