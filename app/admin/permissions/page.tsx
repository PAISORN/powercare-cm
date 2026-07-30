import { ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../../components/app-shell";
import { AutoSubmitSelect } from "../../../components/auto-submit-select";
import { PermissionToggle } from "../../../components/permission-toggle";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { recordAudit } from "../../../modules/audit/audit-service";
import {
  PermissionKey,
  permissionDefaultForRole,
} from "../../../modules/auth/site-admin-permissions";
import { RoleName } from "../../../modules/cm-work/cm-work-types";

const roles = [
  RoleName.ORGANIZATION_ADMIN,
  RoleName.SITE_ADMIN,
  RoleName.ENGINEER,
  RoleName.TECHNICIAN,
  RoleName.STORE_OFFICER,
  RoleName.VISITOR,
] as const;

const decisions = new Set(["INHERIT", "ALLOW", "DENY"]);
const permissionKeys = Object.values(PermissionKey);

async function saveRolePermissions(formData: FormData) {
  "use server";
  const actor = await requireOwner();
  const organizationId = String(formData.get("organizationId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!organizationId || !roles.includes(role as (typeof roles)[number])) redirect("/admin/permissions?error=invalid-role");
  await db.organization.findFirstOrThrow({ where: { id: organizationId, active: true } });
  const scopeKey = `ORG:${organizationId}`;
  const before = await db.rolePermissionOverride.findMany({ where: { scopeKey, role } });
  await db.$transaction(async (tx) => {
    await tx.rolePermissionOverride.deleteMany({ where: { scopeKey, role } });
    const rows = permissionKeys.flatMap((permissionKey) => {
      const decision = String(formData.get(`permission:${permissionKey}`) ?? "INHERIT");
      return decision !== "INHERIT" && decisions.has(decision)
        ? [{ scopeKey, organizationId, role, permissionKey, decision, grantedById: actor.id }]
        : [];
    });
    if (rows.length) await tx.rolePermissionOverride.createMany({ data: rows });
  });
  await recordAudit({
    actorId: actor.id,
    organizationId,
    entityType: "RolePermissionOverride",
    entityId: `${scopeKey}:${role}`,
    action: "UPDATE_ROLE_PERMISSIONS",
    before,
    after: permissionKeys.map((permissionKey) => ({
      permissionKey,
      decision: String(formData.get(`permission:${permissionKey}`) ?? "INHERIT"),
    })),
  });
  redirect(`/admin/permissions?mode=role&organizationId=${organizationId}&role=${role}&saved=1`);
}

async function saveUserPermissions(formData: FormData) {
  "use server";
  const actor = await requireOwner();
  const userId = String(formData.get("userId") ?? "");
  const plantId = String(formData.get("plantId") ?? "");
  const target = await db.user.findFirstOrThrow({
    where: { id: userId, plantId, active: true, role: { not: RoleName.ADMIN } },
    select: { id: true, organizationId: true },
  });
  const before = await db.userPermissionOverride.findMany({ where: { userId } });
  await db.$transaction(async (tx) => {
    await tx.userPermissionOverride.deleteMany({ where: { userId } });
    const rows = permissionKeys.flatMap((permissionKey) => {
      const decision = String(formData.get(`permission:${permissionKey}`) ?? "INHERIT");
      return decision !== "INHERIT" && decisions.has(decision)
        ? [{ userId, permissionKey, decision, grantedById: actor.id }]
        : [];
    });
    if (rows.length) await tx.userPermissionOverride.createMany({ data: rows });
  });
  await recordAudit({
    actorId: actor.id,
    organizationId: target.organizationId ?? undefined,
    entityType: "UserPermissionOverride",
    entityId: userId,
    action: "UPDATE_USER_PERMISSIONS",
    before,
    after: permissionKeys.map((permissionKey) => ({
      permissionKey,
      decision: String(formData.get(`permission:${permissionKey}`) ?? "INHERIT"),
    })),
  });
  redirect(`/admin/permissions?mode=user&plantId=${plantId}&userId=${userId}&saved=1`);
}

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    organizationId?: string;
    plantId?: string;
    role?: string;
    userId?: string;
    saved?: string;
  }>;
}) {
  await requireOwner();
  const query = await searchParams;
  const mode = query.mode === "user" ? "user" : "role";
  const organizations = await db.organization.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const organizationId = organizations.some((item) => item.id === query.organizationId)
    ? query.organizationId!
    : organizations[0]?.id ?? "";
  const plants = await db.plant.findMany({
    where: { active: true },
    select: { id: true, code: true, name: true, organization: { select: { name: true } } },
    orderBy: [{ organization: { name: "asc" } }, { name: "asc" }],
  });
  const plantId = plants.some((item) => item.id === query.plantId)
    ? query.plantId!
    : plants[0]?.id ?? "";
  const role = roles.includes(query.role as (typeof roles)[number]) ? query.role! : RoleName.STORE_OFFICER;
  const users = await db.user.findMany({
    where: { active: true, role: { not: RoleName.ADMIN }, plantId },
    select: {
      id: true,
      fullName: true,
      username: true,
      role: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
    orderBy: [{ organization: { name: "asc" } }, { fullName: "asc" }],
  });
  const userId = users.some((item) => item.id === query.userId) ? query.userId! : users[0]?.id ?? "";
  const selectedUser = users.find((item) => item.id === userId);
  const effectiveOrganizationId = mode === "role" ? organizationId : selectedUser?.organizationId ?? "";
  const effectiveRole = mode === "role"
    ? role
    : selectedUser?.role === "PLANT_ADMIN" ? RoleName.SITE_ADMIN : selectedUser?.role ?? RoleName.VISITOR;
  const roleRows = effectiveOrganizationId
    ? await db.rolePermissionOverride.findMany({
        where: { scopeKey: `ORG:${effectiveOrganizationId}`, role: effectiveRole },
      })
    : [];
  const userRows = mode === "user" && userId
    ? await db.userPermissionOverride.findMany({ where: { userId } })
    : [];
  const roleValues = new Map(roleRows.map((row) => [row.permissionKey, row.decision]));
  const userValues = new Map(userRows.map((row) => [row.permissionKey, row.decision]));
  const values = new Map(
    permissionKeys.map((permissionKey) => {
      const roleDecision = roleValues.get(permissionKey);
      const inheritedDecision = roleDecision ?? (
        permissionDefaultForRole(effectiveRole, permissionKey) ? "ALLOW" : "DENY"
      );
      return [
        permissionKey,
        mode === "user" ? userValues.get(permissionKey) ?? inheritedDecision : inheritedDecision,
      ];
    }),
  );

  return (
    <AppShell>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]"><ShieldCheck size={18} /> Owner Admin Control</p>
          <h1 className="mt-2 text-3xl font-extrabold">Permission Center</h1>
          <p className="mt-2 max-w-3xl text-[var(--muted)]">กำหนดสิทธิ์มาตรฐานตาม Role แล้วปรับเฉพาะราย User ได้ โดย User override มีลำดับสูงสุด</p>
        </div>
        {query.saved ? <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-600">บันทึกแล้ว</span> : null}
      </header>

      <nav className="mt-5 flex gap-6 border-b border-[var(--line)]" aria-label="Permission modes">
        <ModeLink active={mode === "role"} href="/admin/permissions?mode=role" label="Role Permissions" />
        <ModeLink active={mode === "user"} href="/admin/permissions?mode=user" label="User Permissions" />
      </nav>

      <form action="/admin/permissions" className="mt-5 grid gap-4 rounded-3xl border border-[var(--line)] bg-[var(--soft)] p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <input name="mode" type="hidden" value={mode} />
        {mode === "role" ? (
          <>
            <label className="grid gap-1.5 text-sm font-bold">Organization
              <select className={selectClass} defaultValue={organizationId} name="organizationId">
                {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-bold">Role
              <select className={selectClass} defaultValue={role} name="role">
                {roles.map((item) => <option key={item} value={item}>{friendly(item)}</option>)}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="grid gap-1.5 text-sm font-bold">Site
              <AutoSubmitSelect className={selectClass} defaultValue={plantId} name="plantId">
                {plants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name} · {item.organization.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
            <label className="grid gap-1.5 text-sm font-bold">User
              <select className={selectClass} defaultValue={userId} name="userId">
                {!users.length ? <option value="">ไม่พบ User ใน Site นี้</option> : null}
                {users.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {friendly(item.role)}</option>)}
              </select>
            </label>
          </>
        )}
        <button className="min-h-12 rounded-2xl border border-[var(--primary)] px-5 text-sm font-extrabold text-[var(--primary)]" type="submit">
          โหลดสิทธิ์
        </button>
      </form>

      <form action={mode === "role" ? saveRolePermissions : saveUserPermissions} className="mt-5 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        {mode === "role" ? (
          <>
            <input name="organizationId" type="hidden" value={organizationId} />
            <input name="role" type="hidden" value={role} />
          </>
        ) : (
          <>
            <input name="plantId" type="hidden" value={plantId} />
            <input name="userId" type="hidden" value={userId} />
          </>
        )}
        <div className="grid gap-4 border-b border-[var(--line)] bg-[var(--soft)] p-5 md:grid-cols-2">
          <p className="text-sm font-extrabold md:col-span-2">
            กำลังแก้ไข: {mode === "role"
              ? `${organizations.find((item) => item.id === organizationId)?.name ?? "-"} · ${friendly(role)}`
              : users.find((item) => item.id === userId)?.fullName ?? "-"}
          </p>
          <p className="text-sm text-[var(--muted)] md:col-span-2">
            สวิตช์เปิด = Allow · สวิตช์ปิด = Deny โดยระบบตั้งค่าเริ่มต้นตามสิทธิ์ที่มีผลจริง
          </p>
        </div>

        <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {permissionKeys.map((key) => (
            <PermissionToggle
              defaultAllowed={values.get(key) === "ALLOW"}
              description={key}
              key={key}
              name={`permission:${key}`}
              title={friendly(key)}
            />
          ))}
        </div>

        <div className="sticky bottom-0 flex justify-end border-t border-[var(--line)] bg-[var(--surface)]/95 p-4 backdrop-blur">
          <button
            className="min-h-12 rounded-2xl bg-[var(--primary)] px-6 font-extrabold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-45"
            disabled={mode === "user" && !userId}
            type="submit"
          >
            บันทึก Permission
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function ModeLink({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link className={`relative flex min-h-12 items-center gap-2 px-1 text-sm font-extrabold ${active ? "text-[var(--primary)]" : "text-[var(--muted)]"}`} href={href}>
      <UsersRound size={17} /> {label}
      {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--primary)]" /> : null}
    </Link>
  );
}

async function requireOwner() {
  const user = await requireUser();
  if (user.role !== RoleName.ADMIN) redirect("/dashboard");
  return user;
}

function friendly(value: string) {
  return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

const selectClass = "min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-[var(--ink)]";
