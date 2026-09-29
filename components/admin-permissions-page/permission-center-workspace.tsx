import { ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { AutoSubmitSelect } from "../auto-submit-select";
import { PermissionToggle } from "../permission-toggle";
import { saveRolePermissions, saveUserPermissions } from "../../app/admin/permissions/actions";
import { RoleName } from "../../modules/cm-work/cm-work-types";
import { PermissionKey } from "../../modules/auth/site-admin-permissions";
import { friendlyPermissionName, permissionRoles, thaiPermissionDescription } from "../../modules/auth/permission-center-page-model";
import { INVENTORY_ITEM_KINDS } from "../../modules/store/inventory-user-scope";
import type { PermissionCenterPageData } from "../../modules/auth/permission-center-page-data";

const selectClass = "min-h-12 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 text-[var(--ink)]";

export function PermissionCenterWorkspace({
  saved,
  mode,
  organizations,
  organizationId,
  plants,
  plantId,
  role,
  users,
  userId,
  effectiveRole,
  permissionPresentation,
  groupedPermissions,
  inventoryScopeRows,
}: PermissionCenterPageData) {
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)]"><ShieldCheck size={18} /> Owner Admin Control</p>
          <h1 className="mt-2 text-3xl font-extrabold">Permission Center</h1>
          <p className="mt-2 max-w-3xl text-[var(--muted)]">กำหนดสิทธิ์มาตรฐานตาม Role แล้วปรับเฉพาะราย User ได้ โดย User override มีลำดับสูงสุด</p>
        </div>
        {saved ? <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-600">บันทึกแล้ว</span> : null}
      </header>

      <nav className="mt-5 flex gap-6 border-b border-[var(--line)]" aria-label="Permission modes">
        <ModeLink active={mode === "role"} href="/admin/permissions?mode=role" label="Role Permissions" />
        <ModeLink active={mode === "user"} href="/admin/permissions?mode=user" label="User Permissions" />
      </nav>

      <form action="/admin/permissions" className="mt-5 grid gap-4 rounded-3xl border border-[var(--line)] bg-[var(--soft)] p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <input name="mode" type="hidden" value={mode} />
        {mode === "role" ? (
          <>
            <label className={`grid gap-1.5 text-sm font-bold ${role === RoleName.ADMIN ? "opacity-50" : ""}`}>Organization
              <select className={selectClass} defaultValue={organizationId} name="organizationId">
                {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {role === RoleName.ADMIN ? <span className="text-xs font-normal text-[var(--muted)]">Owner Admin ใช้สิทธิ์ระดับระบบ</span> : null}
            </label>
            <label className="grid gap-1.5 text-sm font-bold">Role
              <select className={selectClass} defaultValue={role} name="role">
                {permissionRoles.map((item) => <option key={item} value={item}>{friendlyPermissionName(item)}</option>)}
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
                {users.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {friendlyPermissionName(item.role)}</option>)}
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
              ? `${organizations.find((item) => item.id === organizationId)?.name ?? "-"} · ${friendlyPermissionName(role)}`
              : users.find((item) => item.id === userId)?.fullName ?? "-"}
          </p>
          <p className="text-sm text-[var(--muted)] md:col-span-2">
            ตาม Role = สืบทอดค่าจากระดับก่อนหน้า · Allow/Deny = กำหนด override ระดับที่กำลังแก้ไข
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
                    description={thaiPermissionDescription(key)}
                    inheritedAllowed={permissionPresentation[key].inheritedDecision === "ALLOW"}
                    initialDecision={permissionPresentation[key].overrideDecision}
                    key={key}
                    name={`permission:${key}`}
                    title={friendlyPermissionName(key)}
                  />
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {mode === "user" && effectiveRole !== RoleName.ADMIN ? (
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
    </>
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
