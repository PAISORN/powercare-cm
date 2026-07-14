import { randomUUID } from "node:crypto";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { CalendarClock, Megaphone, Pin, Save } from "lucide-react";
import { redirect } from "next/navigation";
import { AnnouncementDeleteButton } from "../../../components/announcement-delete-button";
import { AppShell } from "../../../components/app-shell";
import { BANGKOK_TIME_ZONE, formatThaiDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { deleteStoredFile, saveAnnouncementImageFile } from "../../../lib/file-storage";
import { requireUser } from "../../../lib/session";
import { canManageAnnouncements } from "../../../modules/auth/permission";
import {
  createAnnouncement,
  deleteAnnouncement,
  setAnnouncementActive,
  updateAnnouncement,
} from "../../../modules/announcements/announcement-service";
import type { AnnouncementInput } from "../../../modules/announcements/announcement-types";
import type { Actor } from "../../../modules/cm-work/cm-work-types";
import { readOrganizationScope } from "../../../modules/organization/organization-scope-service";

function actorFrom(
  user: { id: string; role: string; categoryId: string | null; plantId?: string | null; siteAdminPermissions?: Actor["siteAdminPermissions"] },
  organizationId: string,
): Actor {
  return {
    id: user.id,
    role: user.role as Actor["role"],
    categoryId: user.categoryId,
    organizationId,
    plantId: user.plantId,
    siteAdminPermissions: user.siteAdminPermissions,
  };
}

function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function parseDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error("Publish date is required");
  return fromZonedTime(text, BANGKOK_TIME_ZONE);
}

function inputFrom(formData: FormData, image?: { fileName: string; mimeType: string; fileSize: number; storagePath: string } | null): AnnouncementInput {
  return {
    title: String(formData.get("title") ?? ""),
    content: String(formData.get("content") ?? ""),
    publishStart: parseDate(formData.get("publishStart")),
    publishEnd: parseDate(formData.get("publishEnd")),
    pinned: checkbox(formData, "pinned"),
    active: checkbox(formData, "active"),
    ...(image
      ? {
          imageFileName: image.fileName,
          imageMimeType: image.mimeType,
          imageFileSize: image.fileSize,
          imageStoragePath: image.storagePath,
        }
      : {}),
  };
}

async function createAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAnnouncements(user)) redirect("/dashboard");
  const scope = await readOrganizationScope();
  const id = randomUUID();
  const file = formData.get("image");
  let savedImage: Awaited<ReturnType<typeof saveAnnouncementImageFile>> | null = null;
  try {
    if (file instanceof File && file.size > 0) savedImage = await saveAnnouncementImageFile(id, file);
    await createAnnouncement(actorFrom(user, scope.organization.id), inputFrom(formData, savedImage), id);
  } catch {
    await deleteStoredFile(savedImage?.storagePath);
    redirect("/admin/announcements?error=1");
  }
  redirect("/admin/announcements?saved=1");
}

async function updateAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAnnouncements(user)) redirect("/dashboard");
  const scope = await readOrganizationScope();
  const id = String(formData.get("id") ?? "");
  const existing = await db.announcement.findFirstOrThrow({ where: { id, organizationId: scope.organization.id } });
  const file = formData.get("image");
  try {
    const image = file instanceof File && file.size > 0
      ? await saveAnnouncementImageFile(id, file)
      : existing.imageStoragePath
        ? {
            fileName: existing.imageFileName!,
            mimeType: existing.imageMimeType!,
            fileSize: existing.imageFileSize!,
            storagePath: existing.imageStoragePath,
          }
        : null;
    await updateAnnouncement(actorFrom(user, scope.organization.id), id, inputFrom(formData, image));
  } catch {
    redirect("/admin/announcements?error=1");
  }
  redirect("/admin/announcements?saved=1");
}

async function rowAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAnnouncements(user)) redirect("/dashboard");
  const scope = await readOrganizationScope();
  const id = String(formData.get("id") ?? "");
  const intent = String(formData.get("intent") ?? "");
  try {
    if (intent === "delete") {
      const deleted = await deleteAnnouncement(actorFrom(user, scope.organization.id), id);
      await deleteStoredFile(deleted.imageStoragePath);
    } else {
      await setAnnouncementActive(actorFrom(user, scope.organization.id), id, intent === "activate");
    }
  } catch {
    redirect("/admin/announcements?error=1");
  }
  redirect("/admin/announcements?saved=1");
}

function dateInput(value: Date) {
  return formatInTimeZone(value, BANGKOK_TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
}

export default async function AdminAnnouncementsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  if (!canManageAnnouncements(user)) redirect("/dashboard");
  const scope = await readOrganizationScope();
  const [announcements, query] = await Promise.all([
    db.announcement.findMany({
      where: { organizationId: scope.organization.id },
      orderBy: [{ active: "desc" }, { pinned: "desc" }, { publishStart: "desc" }],
      include: { author: true },
    }),
    searchParams,
  ]);
  const now = new Date();
  const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return (
    <AppShell>
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"><Megaphone size={17} /> Admin Communication</p>
        <h1 className="mt-2 text-3xl font-extrabold">Announcements</h1>
        <p className="mt-2 text-[var(--muted)]">จัดการประกาศที่แสดงในหน้า Public ตามช่วงเวลาประเทศไทย</p>
      </header>

      {query.saved === "1" ? <p className="mt-5 rounded-lg bg-green-500/10 px-4 py-3 font-semibold text-green-700 dark:text-green-300" role="status">บันทึกประกาศเรียบร้อยแล้ว</p> : null}
      {query.error === "1" ? <p className="mt-5 rounded-lg bg-red-500/10 px-4 py-3 font-semibold text-red-700 dark:text-red-300" role="alert">ดำเนินการไม่สำเร็จ กรุณาตรวจข้อมูลและลองใหม่</p> : null}

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]">
        <h2 className="text-xl font-bold">สร้างประกาศใหม่</h2>
        <AnnouncementForm action={createAction} defaultEnd={defaultEnd} defaultStart={now} submitLabel="เผยแพร่ประกาศ" />
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">รายการและประวัติประกาศ</h2>
          <span className="text-sm text-[var(--muted)]">{announcements.length} รายการ</span>
        </div>
        <div className="mt-4 grid gap-4">
          {announcements.map((announcement) => {
            const expired = announcement.publishEnd < now;
            return (
              <article className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]" key={announcement.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold">{announcement.title}</h3>
                      {announcement.pinned ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800"><Pin size={12} /> ปักหมุด</span> : null}
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${announcement.active && !expired ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>{expired ? "หมดอายุ" : announcement.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">โดย {announcement.author.fullName} · แก้ไข {formatThaiDateTime(announcement.updatedAt)}</p>
                  </div>
                  <form action={rowAction} className="flex flex-wrap gap-2">
                    <input name="id" type="hidden" value={announcement.id} />
                    <button className="min-h-10 rounded-md border border-[var(--line)] px-3 text-sm font-bold" name="intent" type="submit" value={announcement.active ? "deactivate" : "activate"}>{announcement.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
                    <AnnouncementDeleteButton />
                  </form>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer font-semibold text-[var(--primary)]">แก้ไขรายละเอียด</summary>
                  <AnnouncementForm action={updateAction} announcement={announcement} defaultEnd={announcement.publishEnd} defaultStart={announcement.publishStart} submitLabel="บันทึกการแก้ไข" />
                </details>
              </article>
            );
          })}
          {!announcements.length ? <p className="rounded-lg border border-dashed border-[var(--line)] p-6 text-center text-[var(--muted)]">ยังไม่มีประกาศ</p> : null}
        </div>
      </section>
    </AppShell>
  );
}

function AnnouncementForm({ action, announcement, defaultStart, defaultEnd, submitLabel }: { action: (formData: FormData) => void | Promise<void>; announcement?: { id: string; title: string; content: string; pinned: boolean; active: boolean; imageFileName: string | null }; defaultStart: Date; defaultEnd: Date; submitLabel: string }) {
  return (
    <form action={action} className="mt-4 grid gap-4">
      {announcement ? <input name="id" type="hidden" value={announcement.id} /> : null}
      <label className="grid gap-1 text-sm font-semibold">หัวข้อ<input className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={announcement?.title} maxLength={160} name="title" required /></label>
      <label className="grid gap-1 text-sm font-semibold">เนื้อหา<textarea className="min-h-28 rounded-md border border-[var(--line)] bg-[var(--soft)] p-3" defaultValue={announcement?.content} maxLength={5000} name="content" required /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold"><span className="flex items-center gap-2"><CalendarClock size={15} /> เริ่มแสดง</span><input className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={dateInput(defaultStart)} name="publishStart" required type="datetime-local" /></label>
        <label className="grid gap-1 text-sm font-semibold"><span className="flex items-center gap-2"><CalendarClock size={15} /> สิ้นสุด</span><input className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3" defaultValue={dateInput(defaultEnd)} name="publishEnd" required type="datetime-local" /></label>
      </div>
      <label className="grid gap-1 text-sm font-semibold">รูปประกาศ PNG/JPG/WebP ไม่เกิน 2 MB<input accept="image/png,image/jpeg,image/webp" className="min-h-11 rounded-md border border-[var(--line)] bg-[var(--soft)] p-2" name="image" type="file" />{announcement?.imageFileName ? <span className="text-xs font-normal text-[var(--muted)]">ไฟล์ปัจจุบัน: {announcement.imageFileName}</span> : null}</label>
      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 font-semibold"><input defaultChecked={announcement?.pinned} name="pinned" type="checkbox" /> ปักหมุดประกาศสำคัญ</label>
        <label className="flex items-center gap-2 font-semibold"><input defaultChecked={announcement ? announcement.active : true} name="active" type="checkbox" /> เปิดใช้งาน</label>
      </div>
      <button className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-[var(--primary)] px-5 font-bold text-white" type="submit"><Save size={17} /> {submitLabel}</button>
    </form>
  );
}
