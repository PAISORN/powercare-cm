import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "../../../components/app-shell";
import { DeleteUserDialog } from "../../../components/delete-user-dialog";
import { ProfilePhotoPreview } from "../../../components/profile-photo-preview";
import { UserAvatar } from "../../../components/user-avatar";
import { db } from "../../../lib/db";
import { deleteStoredFile, saveProfilePhotoFile, saveSignatureFile } from "../../../lib/file-storage";
import { hashPassword, verifyPassword } from "../../../lib/password";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import { RoleName, type RoleName as RoleNameValue } from "../../../modules/cm-work/cm-work-types";

async function createUser(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (current.role !== RoleName.ADMIN) redirect("/dashboard");

  const created = await db.user.create({
    data: {
      username: String(formData.get("username")),
      passwordHash: await hashPassword(String(formData.get("password"))),
      fullName: String(formData.get("fullName")),
      department: String(formData.get("department") ?? ""),
      role: String(formData.get("role")) as RoleNameValue,
      categoryId: String(formData.get("categoryId") || "") || null,
      active: true,
    },
  });

  await recordAudit({
    actorId: current.id,
    entityType: "User",
    entityId: created.id,
    action: "CREATE_USER",
    after: {
      username: created.username,
      fullName: created.fullName,
      department: created.department,
      role: created.role,
      categoryId: created.categoryId,
      active: created.active,
    },
  });

  redirect("/admin/users");
}

async function updateUserProfile(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (current.role !== RoleName.ADMIN) redirect("/dashboard");

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === current.id) redirect("/admin/users");

  const before = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { signature: true, profilePhoto: true } });
  const nextRole = String(formData.get("role")) as RoleNameValue;
  const password = String(formData.get("password") ?? "").trim();
  const signature = formData.get("signature");
  const signatureFile = signature instanceof File && signature.size > 0 ? signature : null;
  const signatureData = signatureFile ? await saveSignatureFile(userId, signatureFile) : null;
  const profilePhoto = formData.get("profilePhoto");
  const profilePhotoFile = profilePhoto instanceof File && profilePhoto.size > 0 ? profilePhoto : null;
  const profilePhotoData = profilePhotoFile ? await saveProfilePhotoFile(userId, profilePhotoFile) : null;

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      username: String(formData.get("username") ?? "").trim(),
      fullName: String(formData.get("fullName") ?? "").trim(),
      department: String(formData.get("department") ?? "").trim(),
      role: nextRole,
      categoryId: String(formData.get("categoryId") || "") || null,
      active: formData.get("active") === "on",
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
      ...(signatureData
        ? {
            signature: {
              upsert: {
                update: signatureData,
                create: signatureData,
              },
            },
          }
        : {}),
      ...(profilePhotoData
        ? {
            profilePhoto: {
              upsert: {
                update: profilePhotoData,
                create: profilePhotoData,
              },
            },
          }
        : {}),
    },
    include: { signature: true, profilePhoto: true },
  });

  await recordAudit({
    actorId: current.id,
    entityType: "User",
    entityId: userId,
    action: "UPDATE_USER_PROFILE",
    before: {
      username: before.username,
      fullName: before.fullName,
      department: before.department,
      role: before.role,
      categoryId: before.categoryId,
      active: before.active,
      hasSignature: Boolean(before.signature),
      hasProfilePhoto: Boolean(before.profilePhoto),
    },
    after: {
      username: updated.username,
      fullName: updated.fullName,
      department: updated.department,
      role: updated.role,
      categoryId: updated.categoryId,
      active: updated.active,
      passwordReset: Boolean(password),
      hasSignature: Boolean(updated.signature),
      hasProfilePhoto: Boolean(updated.profilePhoto),
    },
  });
  if (profilePhotoData && before.profilePhoto?.storagePath && before.profilePhoto.storagePath !== profilePhotoData.storagePath) {
    await deleteStoredFile(before.profilePhoto.storagePath);
  }

  redirect("/admin/users");
}

async function deleteUser(formData: FormData) {
  "use server";
  const current = await requireUser();
  if (current.role !== RoleName.ADMIN) redirect("/dashboard");

  const userId = String(formData.get("userId") ?? "");
  if (!userId || userId === current.id) redirect("/admin/users");

  const adminPassword = String(formData.get("adminPassword") ?? "");
  const currentAdmin = await db.user.findUniqueOrThrow({ where: { id: current.id } });
  const passwordOk = await verifyPassword(adminPassword, currentAdmin.passwordHash);
  if (!passwordOk) redirect("/admin/users?deleteStatus=error");

  const before = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { signature: true, category: true, profilePhoto: true } });
  await db.$transaction([
    db.auditEvent.updateMany({ where: { actorId: userId }, data: { actorId: null } }),
    db.statusHistory.updateMany({ where: { changedById: userId }, data: { changedById: null } }),
    db.cmWork.updateMany({ where: { claimantId: userId }, data: { claimantId: null } }),
    db.cmWork.updateMany({ where: { reviewerId: userId }, data: { reviewerId: null } }),
    db.signature.deleteMany({ where: { userId } }),
    db.profilePhoto.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
    db.auditEvent.create({
      data: {
        actorId: current.id,
        entityType: "User",
        entityId: userId,
        action: "DELETE_USER",
        beforeJson: JSON.stringify({
          username: before.username,
          fullName: before.fullName,
          department: before.department,
          role: before.role,
          categoryName: before.category?.name ?? null,
          active: before.active,
          hasSignature: Boolean(before.signature),
          hasProfilePhoto: Boolean(before.profilePhoto),
        }),
      },
    }),
  ]);
  await deleteStoredFile(before.profilePhoto?.storagePath);

  redirect("/admin/users?deleteStatus=success");
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ deleteStatus?: string }> }) {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  const { deleteStatus } = await searchParams;

  const [users, categories] = await Promise.all([
    db.user.findMany({ include: { category: true, signature: true, profilePhoto: true }, orderBy: { createdAt: "desc" } }),
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell>
      <h1 className="text-3xl font-bold">Users</h1>
      <DeleteStatusNotice status={deleteStatus} />

      <form action={createUser} className="mt-6 grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
        <input name="username" required placeholder="Username" className="rounded-md border p-3 text-black" />
        <input name="password" required placeholder="Password" type="password" className="rounded-md border p-3 text-black" />
        <input name="fullName" required placeholder="ชื่อ-นามสกุล" className="rounded-md border p-3 text-black" />
        <input name="department" placeholder="หน่วยงาน" className="rounded-md border p-3 text-black" />
        <select name="role" required className="rounded-md border p-3 text-black">
          <option value={RoleName.ADMIN}>Admin</option>
          <option value={RoleName.ENGINEER}>Engineer</option>
          <option value={RoleName.TECHNICIAN}>Technician</option>
        </select>
        <select name="categoryId" className="rounded-md border p-3 text-black">
          <option value="">ไม่ผูก Category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button className="w-fit rounded-md bg-[var(--primary)] px-4 py-2 text-white">สร้างผู้ใช้</button>
      </form>

      <div className="mt-6 grid gap-3">
        {users.map((item) => (
          <div key={item.id} aria-label={`User ${item.username}`} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar fullName={item.fullName} hasPhoto={Boolean(item.profilePhoto)} size="md" userId={item.id} version={item.profilePhoto?.updatedAt.getTime()} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">{item.fullName}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {item.username} · {item.department || "-"} · {item.signature ? "มีลายเซ็น" : "ยังไม่มีลายเซ็น"} · {item.profilePhoto ? "มีรูปโปรไฟล์" : "ยังไม่มีรูปโปรไฟล์"}
                  </p>
                </div>
              </div>
              {item.id === user.id ? <span className="rounded-full bg-[var(--soft)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">บัญชีปัจจุบัน</span> : null}
            </div>

            {item.id === user.id ? (
              <div className="mt-4 grid gap-3 rounded-2xl bg-[var(--soft)] p-4 text-sm text-[var(--muted)] md:grid-cols-3">
                <span>Role: {item.role}</span>
                <span>Category: {item.category?.name ?? "-"}</span>
                <span>Status: {item.active ? "Active" : "Inactive"}</span>
              </div>
            ) : (
              <form action={updateUserProfile} aria-label={`Edit ${item.username}`} className="mt-4 grid gap-3 rounded-2xl bg-[var(--soft)] p-4">
                <input name="userId" type="hidden" value={item.id} />
                <div className="grid gap-3 lg:grid-cols-3">
                  <label className="grid gap-1 text-sm font-semibold">
                    Username
                    <input name="username" required defaultValue={item.username} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    ชื่อ-นามสกุล
                    <input name="fullName" required defaultValue={item.fullName} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    หน่วยงาน
                    <input name="department" defaultValue={item.department ?? ""} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                  </label>
                </div>
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
                  <label className="grid gap-1 text-sm font-semibold">
                    Role
                    <select name="role" defaultValue={item.role} required className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]">
                      <option value={RoleName.ADMIN}>Admin</option>
                      <option value={RoleName.ENGINEER}>Engineer</option>
                      <option value={RoleName.TECHNICIAN}>Technician</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Category
                    <select name="categoryId" defaultValue={item.categoryId ?? ""} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]">
                      <option value="">ไม่ผูก Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Reset password
                    <input name="password" placeholder="ใส่รหัสใหม่เมื่อต้องการ reset" type="password" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                  </label>
                  <label className="flex h-12 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold">
                    <input name="active" type="checkbox" defaultChecked={item.active} className="h-4 w-4" />
                    Active
                  </label>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold">
                    Upload signature PNG/JPG
                    <input name="signature" type="file" accept="image/png,image/jpeg" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-[var(--ink)]" />
                  </label>
                  <div className="grid gap-1 text-sm font-semibold">
                    Upload profile photo PNG/JPG
                    <ProfilePhotoPreview />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="h-12 rounded-xl bg-[var(--primary)] px-4 font-bold text-white shadow-sm" type="submit">
                    บันทึกทั้งหมด
                  </button>
                </div>
              </form>
            )}

            {item.id !== user.id ? (
              <div className="mt-3 flex justify-end">
                <DeleteUserDialog action={deleteUser} fullName={item.fullName} userId={item.id} username={item.username} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function DeleteStatusNotice({ status }: { status?: string }) {
  if (status === "success") {
    return (
      <div role="status" className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-7 text-center text-emerald-700 shadow-sm">
        <CheckCircle2 aria-hidden="true" size={74} strokeWidth={2.2} />
        <strong className="mt-3 text-2xl">ลบสำเร็จ</strong>
        <span className="mt-1 text-sm font-semibold text-emerald-600">ระบบบันทึกประวัติการลบไว้เรียบร้อยแล้ว</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-red-200 bg-red-50 px-5 py-7 text-center text-red-700 shadow-sm">
        <XCircle aria-hidden="true" size={74} strokeWidth={2.2} />
        <strong className="mt-3 text-2xl">ไม่สำเร็จ</strong>
        <span className="mt-1 text-sm font-semibold text-red-600">โปรดตรวจสอบรหัสผ่าน</span>
      </div>
    );
  }

  return null;
}
