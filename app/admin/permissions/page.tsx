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
  canUseUserPermission,
  permissionDefaultForRole,
} from "../../../modules/auth/site-admin-permissions";
import { RoleName } from "../../../modules/cm-work/cm-work-types";
import { INVENTORY_ITEM_KINDS, normalizeInventoryScopeKinds } from "../../../modules/store/inventory-user-scope";

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
    select: { id: true, organizationId: true, role: true },
  });
  const responsibilityKinds = normalizeInventoryScopeKinds(formData.getAll("inventoryResponsibility"));
  const approvalKinds = normalizeInventoryScopeKinds(formData.getAll("inventoryApproval"));
  const approvalAllowed = String(formData.get(`permission:${PermissionKey.APPROVE_STORE_ISSUE}`)) === "ALLOW";
  if (target.role === RoleName.STORE_OFFICER && responsibilityKinds.length === 0) {
    redirect(`/admin/permissions?mode=user&plantId=${plantId}&userId=${userId}&error=responsibility-required`);
  }
  if (approvalAllowed && approvalKinds.length === 0) {
    redirect(`/admin/permissions?mode=user&plantId=${plantId}&userId=${userId}&error=approval-required`);
  }
  await assertPendingInventoryCoverage({ userId, plantId, responsibilityKinds, approvalKinds, approvalAllowed, issueAllowed: String(formData.get(`permission:${PermissionKey.ISSUE_STOCK}`)) === "ALLOW" });
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
    await tx.userInventoryScope.deleteMany({ where: { userId } });
    const scopeRows = INVENTORY_ITEM_KINDS.flatMap((itemKind) => {
      const responsibilityEnabled = responsibilityKinds.includes(itemKind);
      const approvalEnabled = approvalKinds.includes(itemKind);
      return responsibilityEnabled || approvalEnabled ? [{ userId, itemKind, responsibilityEnabled, approvalEnabled }] : [];
    });
    if (scopeRows.length) await tx.userInventoryScope.createMany({ data: scopeRows });
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
  const inventoryScopeRows = mode === "user" && userId
    ? await db.userInventoryScope.findMany({ where: { userId } })
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
  const groupedPermissions = groupPermissionKeys(permissionKeys);

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

        <div className="grid gap-4 p-4 sm:p-5">
          <nav aria-label="Permission categories" className="flex flex-wrap gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-3">
            {groupedPermissions.map((group) => (
              <a className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]" href={`#permission-group-${group.id}`} key={group.id}>
                {group.title} · {group.keys.length}
              </a>
            ))}
          </nav>
          {groupedPermissions.map((group) => (
            <fieldset className="scroll-mt-24 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4" id={`permission-group-${group.id}`} key={group.id}>
              <legend className="max-w-[calc(100%-1rem)] px-2 font-extrabold">
                <span>{group.title}</span>
                <span className="ml-2 rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--muted)]">{group.keys.length} หัวข้อ</span>
              </legend>
              <p className="mb-3 mt-1 text-sm leading-6 text-[var(--muted)]">{group.description}</p>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {group.keys.map((key) => (
                  <PermissionToggle
                    defaultAllowed={values.get(key) === "ALLOW"}
                    description={thaiPermissionDescription(key)}
                    key={key}
                    name={`permission:${key}`}
                    title={friendly(key)}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {mode === "user" ? (
          <div className="border-t border-[var(--line)] p-5">
            <h2 className="text-lg font-extrabold">ขอบเขตคลังตามประเภท</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">มองเห็นสต็อกได้ทุกประเภท แต่แก้ไข อนุมัติ และจ่ายได้เฉพาะประเภทที่เปิดไว้ร่วมกับ Permission ด้านบน</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InventoryScopeGroup
                name="inventoryResponsibility"
                title="รับผิดชอบและตัดสต็อก"
                enabled={new Set(inventoryScopeRows.filter((row) => row.responsibilityEnabled).map((row) => row.itemKind))}
              />
              <InventoryScopeGroup
                name="inventoryApproval"
                title="อนุมัติใบเบิก"
                enabled={new Set(inventoryScopeRows.filter((row) => row.approvalEnabled).map((row) => row.itemKind))}
              />
            </div>
          </div>
        ) : null}

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

function InventoryScopeGroup({ name, title, enabled }: { name: string; title: string; enabled: Set<string> }) {
  const labels: Record<string, string> = { SPARE_PART: "อะไหล่", CHEMICAL: "สารเคมี", OIL: "น้ำมัน" };
  return (
    <fieldset className="rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
      <legend className="px-2 font-extrabold">{title}</legend>
      <div className="mt-2 grid gap-2">
        {INVENTORY_ITEM_KINDS.map((kind) => (
          <label className="flex min-h-12 items-center justify-between rounded-xl bg-[var(--surface)] px-4 font-bold" key={kind}>
            {labels[kind]}
            <span className="relative inline-flex h-7 w-12 items-center">
              <input className="peer sr-only" defaultChecked={enabled.has(kind)} name={name} type="checkbox" value={kind} />
              <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-[var(--primary)]" />
              <span className="absolute left-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
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
  if (user.role !== RoleName.ADMIN) redirect("/dashboardcm");
  return user;
}

function friendly(value: string) {
  return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

const thaiActionWords: Record<string, string> = {
  access: "เข้าใช้งาน",
  adjust: "ปรับยอด",
  assign: "มอบหมาย",
  attach: "แนบ",
  backup: "สำรองและกู้คืน",
  cancel: "ยกเลิก",
  claim: "รับ",
  close: "ปิด",
  create: "สร้าง",
  deactivate: "ปิดใช้งาน",
  delete: "ลบ",
  edit: "แก้ไข",
  enable: "เปิดใช้งาน",
  export: "ส่งออก",
  filter: "กรอง",
  issue: "ตัดจ่าย",
  login: "เข้าสู่ระบบ",
  manage: "จัดการ",
  print: "พิมพ์",
  receive: "รับเข้า",
  recode: "เปลี่ยนรหัส",
  record: "บันทึก",
  reopen: "เปิดกลับ",
  reassign: "เปลี่ยนผู้รับผิดชอบ",
  reply: "ตอบกลับ",
  require: "บังคับใช้",
  reset: "รีเซ็ต",
  review: "ตรวจสอบ",
  select: "เลือก",
  send: "ส่ง",
  start: "เริ่ม",
  submit: "ส่ง",
  test: "ทดสอบ",
  track: "ติดตาม",
  update: "แก้ไข",
  view: "ดู",
};

const thaiPermissionWords: Record<string, string> = {
  active: "สถานะออนไลน์",
  admin: "ผู้ดูแลระบบ",
  after: "หลังทำงาน",
  all: "ทั้งหมด",
  announcements: "ประกาศ",
  assets: "ทรัพย์สิน",
  assignment: "การมอบหมาย Engineer",
  assignee: "ผู้รับผิดชอบ",
  audit: "ประวัติการตรวจสอบ",
  backlog: "งานค้าง",
  before: "ก่อนทำงาน",
  cancel: "การยกเลิก",
  categories: "หมวดหมู่",
  category: "หมวดหมู่",
  checkbox: "สวิตช์ Permission",
  close: "การปิดงาน",
  company: "บริษัท",
  completion: "เอกสารปิดงาน",
  contact: "ข้อมูลติดต่อ",
  correction: "การแก้ไข",
  cross: "ข้าม",
  dashboard: "แดชบอร์ด",
  date: "วันที่",
  developer: "นักพัฒนา",
  detail: "รายละเอียด",
  documents: "เอกสาร",
  due: "กำหนดเสร็จ",
  engineer: "Engineer",
  expanded: "แบบละเอียด",
  feedback: "ข้อเสนอแนะ",
  files: "ไฟล์",
  fix: "วิธีซ่อม",
  for: "ให้",
  history: "ประวัติ",
  internal: "ภายใน",
  inventory: "สต็อก",
  kpi: "KPI",
  line: "LINE",
  log: "บันทึกระบบ",
  master: "ข้อมูลหลัก",
  members: "สมาชิก",
  messaging: "การส่งข้อความ",
  method: "วิธีการ",
  mtbf: "MTBF",
  mttr: "MTTR",
  notifications: "การแจ้งเตือน",
  organization: "องค์กร",
  overdue: "เกินกำหนด",
  own: "ของตนเอง",
  parts: "อะไหล่",
  permission: "Permission",
  permissions: "Permission",
  photo: "รูปภาพ",
  photos: "รูปภาพ",
  plant: "Site",
  plants: "Site",
  priority: "ความเร่งด่วน",
  profile: "โปรไฟล์",
  progress: "ความคืบหน้า",
  public: "สาธารณะ",
  qr: "QR Code",
  reason: "เหตุผล",
  reports: "รายงาน",
  request: "ใบแจ้งงาน",
  restore: "กู้คืนข้อมูล",
  role: "Role",
  settings: "การตั้งค่า",
  site: "Site",
  sla: "SLA",
  spare: "อะไหล่",
  status: "สถานะงาน",
  stock: "สต็อก",
  store: "คลังสินค้า",
  super: "Owner Admin",
  system: "ระบบ",
  team: "ทีม",
  technician: "Technician",
  tracking: "การติดตาม",
  user: "ผู้ใช้",
  users: "ผู้ใช้",
  value: "มูลค่า",
  visitor: "ผู้เข้าชม",
  workload: "ภาระงาน",
  work: "งานซ่อม",
  zone: "พื้นที่",
};

function thaiPermissionDescription(key: PermissionKey) {
  if (key === PermissionKey.LOGIN) return "อนุญาตให้ผู้ใช้เข้าสู่ระบบ";
  const words = key.split("_");
  const action = thaiActionWords[words[0]] ?? "ใช้งาน";
  const target = words.slice(1)
    .map((word) => thaiPermissionWords[word] ?? word.toUpperCase())
    .join(" ")
    .replaceAll("อะไหล่ อะไหล่", "อะไหล่")
    .replaceAll("QR Code Code", "QR Code");
  return `อนุญาตให้${action}${target ? ` ${target}` : " Permission นี้"}`;
}

const selectClass = "min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-[var(--ink)]";

const permissionGroupDefinitions = [
  { id: "access", title: "การเข้าใช้งานและข้อมูลส่วนตัว", description: "การเข้าสู่ระบบ Dashboard โปรไฟล์ และสิทธิ์พื้นฐานของผู้ใช้งาน", matches: ["login", "access_public_qr", "view_dashboard", "view_profile", "update_own_profile", "select_plant_context"] },
  { id: "users", title: "ผู้ใช้ Role และการมอบหมายสิทธิ์", description: "สร้าง แก้ไข ปิดใช้งาน User รวมถึง Role, Site, Category และขอบเขต Inventory", matches: ["assign_inventory_responsibility"], tokens: ["user", "member", "super_admin", "site_admin_permission", "checkbox_permission"] },
  { id: "maintenance", title: "งานซ่อมและขั้นตอนดำเนินงาน", description: "การสร้าง รับงาน ดำเนินงาน ตรวจรับ ปิดงาน และจัดการข้อมูลในใบงาน CM", matches: ["record_spare_parts"], tokens: ["work", "request", "claim", "assign", "reassign", "cancel", "priority", "progress", "fix_method", "before_after", "waiting_close", "reopen", "close_detail", "review", "close_work", "completion_document", "completion_pdf"] },
  { id: "inventory", title: "Store และ Inventory", description: "คลังสินค้า สต็อก รับเข้า ปรับยอด ใบเบิก การอนุมัติ และการตัดจ่าย", matches: ["manage_spare_parts"], tokens: ["store", "stock", "public_store_issue"] },
  { id: "assets", title: "Assets และทะเบียนเครื่องจักร", description: "การดู จัดการเอกสาร QR เปลี่ยนรหัส และยกเลิกทะเบียน Assets", tokens: ["asset"] },
  { id: "reports", title: "รายงาน KPI และประวัติ", description: "รายงาน สถิติ KPI, MTTR/MTBF, Backlog, History, Audit และการส่งออกข้อมูล", tokens: ["report", "kpi", "mttr", "mtbf", "backlog", "history", "audit", "export", "backup", "developer_system_log"] },
  { id: "communication", title: "การแจ้งเตือนและการสื่อสาร", description: "Notification, Announcement, LINE และ Feedback", tokens: ["notification", "announcement", "line", "feedback"] },
  { id: "configuration", title: "Organization, Site และการตั้งค่า", description: "โครงสร้างองค์กร ข้อมูล Site, Category, Zone, SLA, QR และการตั้งค่าระบบ", tokens: ["organization", "plant", "category", "zone", "qr_code", "system_setting", "sla", "work_status", "cross_plant"] },
] as const;

function groupPermissionKeys(keys: readonly PermissionKey[]) {
  const groups = permissionGroupDefinitions.map((definition) => ({ ...definition, keys: [] as PermissionKey[] }));
  const other = { id: "other", title: "สิทธิ์อื่น ๆ", description: "สิทธิ์เพิ่มเติมที่ไม่อยู่ในหมวดหลัก", keys: [] as PermissionKey[] };
  for (const key of keys) {
    const group = groups.find((definition) =>
      ("matches" in definition && definition.matches?.includes(key as never)) ||
      ("tokens" in definition && definition.tokens?.some((token) => key.includes(token))),
    );
    (group ?? other).keys.push(key);
  }
  return [...groups.filter((group) => group.keys.length > 0), ...(other.keys.length ? [other] : [])];
}

async function assertPendingInventoryCoverage(input: {
  userId: string;
  plantId: string;
  responsibilityKinds: string[];
  approvalKinds: string[];
  approvalAllowed: boolean;
  issueAllowed: boolean;
}) {
  const pending = await db.sparePartIssue.findMany({
    where: { plantId: input.plantId, status: { in: ["WAITING_ENGINEER_APPROVAL", "WAITING_STORE_ISSUE", "PARTIALLY_ISSUED"] } },
    select: { itemKind: true, status: true },
  });
  if (!pending.length) return;
  const plant = await db.plant.findUniqueOrThrow({ where: { id: input.plantId }, select: { organizationId: true } });
  const [users, roleOverrides] = await Promise.all([
    db.user.findMany({
      where: { plantId: input.plantId, active: true, id: { not: input.userId } },
      include: { inventoryScopes: true, userPermissionOverrides: true, siteAdminPermissions: true },
    }),
    db.rolePermissionOverride.findMany({ where: { OR: [{ scopeKey: "SYSTEM" }, { organizationId: plant.organizationId }] } }),
  ]);
  const coveredByOther = (kind: string, mode: "approval" | "issue") => users.some((candidate) => {
    const scoped = candidate.inventoryScopes.some((scope) => scope.itemKind === kind && (mode === "approval" ? scope.approvalEnabled : scope.responsibilityEnabled));
    const permission = mode === "approval" ? PermissionKey.APPROVE_STORE_ISSUE : PermissionKey.ISSUE_STOCK;
    return scoped && canUseUserPermission({ ...candidate, rolePermissionOverrides: roleOverrides }, permission);
  });
  for (const kind of INVENTORY_ITEM_KINDS) {
    const needsApproval = pending.some((issue) => issue.itemKind === kind && issue.status === "WAITING_ENGINEER_APPROVAL");
    const targetApproves = input.approvalAllowed && input.approvalKinds.includes(kind);
    if (needsApproval && !targetApproves && !coveredByOther(kind, "approval")) throw new Error(`Cannot remove the last ${kind} approver while requests are pending.`);
    const needsIssue = pending.some((issue) => issue.itemKind === kind && ["WAITING_STORE_ISSUE", "PARTIALLY_ISSUED"].includes(issue.status));
    const targetIssues = input.issueAllowed && input.responsibilityKinds.includes(kind);
    if (needsIssue && !targetIssues && !coveredByOther(kind, "issue")) throw new Error(`Cannot remove the last ${kind} issuer while requests are pending.`);
  }
}
