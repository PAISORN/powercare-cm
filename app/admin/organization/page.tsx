import { Building2, Image as ImageIcon, Save } from "lucide-react";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { deleteStoredFile, saveOrganizationLogoFile } from "../../../lib/file-storage";
import { requireUser } from "../../../lib/session";
import { RoleName, type Actor } from "../../../modules/cm-work/cm-work-types";
import { ORGANIZATION_PROFILE_ID } from "../../../modules/organization/organization-profile";
import {
  readOrganizationProfile,
  updateOrganizationProfile,
} from "../../../modules/organization/organization-service";

async function updateOrganizationAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");

  const existing = await readOrganizationProfile();
  const file = formData.get("logo");
  let uploaded: Awaited<ReturnType<typeof saveOrganizationLogoFile>> | null = null;

  try {
    if (file instanceof File && file.size > 0) {
      uploaded = await saveOrganizationLogoFile(ORGANIZATION_PROFILE_ID, file);
    }
    await updateOrganizationProfile(
      { id: user.id, role: user.role, categoryId: user.categoryId } as Actor,
      {
        companyName: String(formData.get("companyName") ?? ""),
        logoFileName: uploaded?.fileName ?? existing.logoFileName,
        logoMimeType: uploaded?.mimeType ?? existing.logoMimeType,
        logoFileSize: uploaded?.fileSize ?? existing.logoFileSize,
        logoStoragePath: uploaded?.storagePath ?? existing.logoStoragePath,
      },
    );
  } catch {
    await deleteStoredFile(uploaded?.storagePath);
    redirect("/admin/organization?error=1");
  }

  if (uploaded && existing.logoStoragePath !== uploaded.storagePath) {
    await deleteStoredFile(existing.logoStoragePath);
  }
  redirect("/admin/organization?saved=1");
}

export default async function AdminOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const [organization, query] = await Promise.all([readOrganizationProfile(), searchParams]);

  return (
    <AppShell>
      <header>
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
          <Building2 aria-hidden="true" size={17} />
          Admin Organization
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">ข้อมูลองค์กร</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          จัดการชื่อและโลโก้บริษัทสำหรับนำไปใช้ในเอกสารปิดงานและส่วนอื่นของระบบ
        </p>
      </header>

      {query.saved === "1" ? (
        <p className="mt-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">
          บันทึกข้อมูลองค์กรเรียบร้อยแล้ว
        </p>
      ) : null}
      {query.error === "1" ? (
        <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">
          บันทึกไม่สำเร็จ กรุณาตรวจสอบชื่อบริษัทและไฟล์โลโก้
        </p>
      ) : null}

      <section className="mt-6 grid max-w-5xl gap-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] md:grid-cols-[260px_minmax(0,1fr)] md:p-6">
        <div className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--soft)] p-5">
          {organization.hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="โลโก้บริษัทปัจจุบัน" className="max-h-44 w-full object-contain" src="/organization-logo" />
          ) : (
            <div className="text-center text-[var(--muted)]">
              <ImageIcon aria-hidden="true" className="mx-auto" size={42} />
              <p className="mt-3 font-semibold">ยังไม่มีโลโก้บริษัท</p>
            </div>
          )}
        </div>

        <form action={updateOrganizationAction} className="grid content-start gap-5">
          <label className="grid gap-2 text-sm font-semibold">
            ชื่อบริษัท
            <input
              className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--soft)] px-4 text-base"
              defaultValue={organization.companyName}
              maxLength={200}
              name="companyName"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            อัปโหลดโลโก้บริษัท
            <input
              accept="image/png,image/jpeg,image/webp"
              className="min-h-12 rounded-md border border-[var(--line)] bg-[var(--soft)] p-2"
              name="logo"
              type="file"
            />
            <span className="font-normal text-[var(--muted)]">รองรับ PNG, JPG และ WebP ขนาดไม่เกิน 2 MB ไฟล์ใหม่จะแทนที่ไฟล์เดิม</span>
          </label>
          <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[var(--primary)] px-5 font-bold text-white transition hover:bg-[var(--primary-strong)]" type="submit">
            <Save aria-hidden="true" size={18} />
            บันทึกข้อมูลองค์กร
          </button>
        </form>
      </section>
    </AppShell>
  );
}
