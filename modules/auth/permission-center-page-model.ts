import { RoleName } from "../cm-work/cm-work-types";
import { PermissionKey, permissionDefaultForRole } from "./site-admin-permissions";

export const permissionRoles = [
  RoleName.ADMIN,
  RoleName.ORGANIZATION_ADMIN,
  RoleName.SITE_ADMIN,
  RoleName.ENGINEER,
  RoleName.TECHNICIAN,
  RoleName.STORE_OFFICER,
  RoleName.VISITOR,
] as const;

export const permissionKeys = Object.values(PermissionKey);

export type PermissionCenterMode = "role" | "user";
export type PermissionDecision = "ALLOW" | "DENY";

export function changedPermissionKeys(formData: FormData, editablePermissionKeys: PermissionKey[]) {
  const editable = new Set(editablePermissionKeys);
  return [...new Set(formData.getAll("changedPermissionKeys").map(String))]
    .filter((permissionKey): permissionKey is PermissionKey => editable.has(permissionKey as PermissionKey));
}

export function resolvePermissionPresentation(input: {
  mode: PermissionCenterMode;
  effectiveRole: string;
  selectedRoleScopeKey: string;
  effectiveOrganizationId: string;
  roleRows: readonly { scopeKey: string; organizationId?: string | null; permissionKey: string; decision: string }[];
  userRows: readonly { permissionKey: string; decision: string }[];
}) {
  const userValues = new Map(input.userRows.map((row) => [row.permissionKey, row.decision]));

  return Object.fromEntries(permissionKeys.map((permissionKey) => {
    const systemDecision = normalizeDecision(input.roleRows.find((row) =>
      row.scopeKey === "SYSTEM" && row.permissionKey === permissionKey,
    )?.decision);
    const organizationDecision = normalizeDecision(input.roleRows.find((row) =>
      row.organizationId === input.effectiveOrganizationId && row.permissionKey === permissionKey,
    )?.decision);
    const roleInherited = systemDecision ?? (
      permissionDefaultForRole(input.effectiveRole, permissionKey) ? "ALLOW" : "DENY"
    );
    const inheritedDecision = input.mode === "user"
      ? organizationDecision ?? roleInherited
      : input.selectedRoleScopeKey === "SYSTEM" ? (
          permissionDefaultForRole(input.effectiveRole, permissionKey) ? "ALLOW" : "DENY"
        ) : roleInherited;
    const overrideDecision = input.mode === "user"
      ? normalizeDecision(userValues.get(permissionKey)) ?? "INHERIT"
      : normalizeDecision(input.roleRows.find((row) =>
          row.scopeKey === input.selectedRoleScopeKey && row.permissionKey === permissionKey,
        )?.decision) ?? "INHERIT";
    return [permissionKey, {
      overrideDecision,
      inheritedDecision,
      effectiveDecision: overrideDecision === "INHERIT" ? inheritedDecision : overrideDecision,
    }];
  })) as Record<PermissionKey, {
    overrideDecision: PermissionDecision | "INHERIT";
    inheritedDecision: PermissionDecision;
    effectiveDecision: PermissionDecision;
  }>;
}

function normalizeDecision(value: string | undefined): PermissionDecision | undefined {
  return value === "ALLOW" || value === "DENY" ? value : undefined;
}

export function friendlyPermissionName(value: string) {
  if (value === PermissionKey.VIEW_MY_ACTIVITIES) return "My Activities";
  if (value === PermissionKey.VIEW_MY_ACTIVITIES_CM) return "My Activities · งาน CM";
  if (value === PermissionKey.VIEW_MY_ACTIVITIES_STORE) return "My Activities · งาน Store";
  if (value === PermissionKey.EDIT_WORK_REQUEST) return "แก้ไขข้อมูลใบแจ้งซ่อม";
  return value.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

const thaiActionWords: Record<string, string> = {
  access: "เข้าใช้งาน", adjust: "ปรับยอด", assign: "มอบหมาย", attach: "แนบ", backup: "สำรองและกู้คืน",
  cancel: "ยกเลิก", claim: "รับ", close: "ปิด", create: "สร้าง", deactivate: "ปิดใช้งาน", delete: "ลบ",
  edit: "แก้ไข", enable: "เปิดใช้งาน", export: "ส่งออก", filter: "กรอง", issue: "ตัดจ่าย", login: "เข้าสู่ระบบ",
  manage: "จัดการ", print: "พิมพ์", receive: "รับเข้า", recode: "เปลี่ยนรหัส", record: "บันทึก", reopen: "เปิดกลับ",
  reassign: "เปลี่ยนผู้รับผิดชอบ", reply: "ตอบกลับ", require: "บังคับใช้", reset: "รีเซ็ต", review: "ตรวจสอบ",
  select: "เลือก", send: "ส่ง", start: "เริ่ม", submit: "ส่ง", test: "ทดสอบ", track: "ติดตาม",
  update: "แก้ไข", view: "ดู",
};

const thaiPermissionWords: Record<string, string> = {
  active: "สถานะออนไลน์", admin: "ผู้ดูแลระบบ", after: "หลังทำงาน", all: "ทั้งหมด", announcements: "ประกาศ",
  assets: "ทรัพย์สิน", assignment: "การมอบหมาย Engineer", assignee: "ผู้รับผิดชอบ", audit: "ประวัติการตรวจสอบ",
  backlog: "งานค้าง", before: "ก่อนทำงาน", cancel: "การยกเลิก", categories: "หมวดหมู่", category: "หมวดหมู่",
  checkbox: "สวิตช์ Permission", close: "การปิดงาน", company: "บริษัท", completion: "เอกสารปิดงาน",
  contact: "ข้อมูลติดต่อ", correction: "การแก้ไข", cross: "ข้าม", dashboard: "แดชบอร์ด", date: "วันที่",
  developer: "นักพัฒนา", detail: "รายละเอียด", documents: "เอกสาร", due: "กำหนดเสร็จ", engineer: "Engineer",
  expanded: "แบบละเอียด", feedback: "ข้อเสนอแนะ", files: "ไฟล์", fix: "วิธีซ่อม", for: "ให้",
  history: "ประวัติ", internal: "ภายใน", inventory: "สต็อก", kpi: "KPI", line: "LINE", log: "บันทึกระบบ",
  master: "ข้อมูลหลัก", members: "สมาชิก", messaging: "การส่งข้อความ", method: "วิธีการ", mtbf: "MTBF",
  mttr: "MTTR", notifications: "การแจ้งเตือน", organization: "องค์กร", overdue: "เกินกำหนด", own: "ของตนเอง",
  parts: "อะไหล่", permission: "Permission", permissions: "Permission", photo: "รูปภาพ", photos: "รูปภาพ",
  plant: "Site", plants: "Site", priority: "ความเร่งด่วน", profile: "โปรไฟล์", progress: "ความคืบหน้า",
  public: "สาธารณะ", qr: "QR Code", reason: "เหตุผล", reports: "รายงาน", request: "ใบแจ้งงาน",
  restore: "กู้คืนข้อมูล", role: "Role", settings: "การตั้งค่า", site: "Site", sla: "SLA", spare: "อะไหล่",
  status: "สถานะงาน", stock: "สต็อก", store: "คลังสินค้า", super: "Owner Admin", system: "ระบบ",
  team: "ทีม", technician: "Technician", tracking: "การติดตาม", user: "ผู้ใช้", users: "ผู้ใช้",
  value: "มูลค่า", visitor: "ผู้เข้าชม", workload: "ภาระงาน", work: "งานซ่อม", zone: "พื้นที่",
};

export function thaiPermissionDescription(key: PermissionKey) {
  if (key === PermissionKey.LOGIN) return "อนุญาตให้ผู้ใช้เข้าสู่ระบบ";
  if (key === PermissionKey.VIEW_MY_ACTIVITIES) return "อนุญาตให้เห็นเมนูและเปิดหน้า My Activities";
  if (key === PermissionKey.VIEW_MY_ACTIVITIES_CM) return "อนุญาตให้มองเห็นงาน CM ที่ตนรับผิดชอบหรือต้องตรวจรับใน My Activities";
  if (key === PermissionKey.VIEW_MY_ACTIVITIES_STORE) return "อนุญาตให้มองเห็นใบเบิก Store ที่ตนต้องอนุมัติ จ่าย หรือแก้ไขใน My Activities";
  if (key === PermissionKey.EDIT_WORK_REQUEST) return "อนุญาตให้แก้ไขข้อมูลผู้แจ้ง หมวด โซน เครื่องจักร ปัญหา และความเร่งด่วนจากหน้า All Work";
  const words = key.split("_");
  const action = thaiActionWords[words[0]] ?? "ใช้งาน";
  const target = words.slice(1).map((word) => thaiPermissionWords[word] ?? word.toUpperCase()).join(" ")
    .replaceAll("อะไหล่ อะไหล่", "อะไหล่").replaceAll("QR Code Code", "QR Code");
  return `อนุญาตให้${action}${target ? ` ${target}` : " Permission นี้"}`;
}

const permissionGroupDefinitions = [
  { id: "access", title: "การเข้าใช้งานและข้อมูลส่วนตัว", description: "การเข้าสู่ระบบ Dashboard, My Activities, โปรไฟล์ และสิทธิ์พื้นฐานของผู้ใช้งาน", matches: ["login", "access_public_qr", "view_dashboard", "view_my_activities", "view_my_activities_cm", "view_my_activities_store", "view_profile", "update_own_profile", "select_plant_context"] },
  { id: "users", title: "ผู้ใช้ Role และการมอบหมายสิทธิ์", description: "สร้าง แก้ไข ปิดใช้งาน User รวมถึง Role, Site, Category และขอบเขต Inventory", matches: ["assign_inventory_responsibility"], tokens: ["user", "member", "super_admin", "site_admin_permission", "checkbox_permission"] },
  { id: "maintenance", title: "งานซ่อมและขั้นตอนดำเนินงาน", description: "การสร้าง รับงาน ดำเนินงาน ตรวจรับ ปิดงาน และจัดการข้อมูลในใบงาน CM", matches: ["record_spare_parts"], tokens: ["work", "request", "claim", "assign", "reassign", "cancel", "priority", "progress", "fix_method", "before_after", "waiting_close", "reopen", "close_detail", "review", "close_work", "completion_document", "completion_pdf"] },
  { id: "inventory", title: "Store และ Inventory", description: "คลังสินค้า สต็อก รับเข้า ปรับยอด ใบเบิก การอนุมัติ และการตัดจ่าย", matches: ["manage_spare_parts"], tokens: ["store", "stock", "public_store_issue"] },
  { id: "assets", title: "Assets และทะเบียนเครื่องจักร", description: "การดู จัดการเอกสาร QR เปลี่ยนรหัส และยกเลิกทะเบียน Assets", tokens: ["asset"] },
  { id: "pm", title: "Preventive Maintenance", description: "สิทธิ์สำหรับ PM Group แผน PM และการปฏิบัติงาน PM", matches: ["view_pm", "manage_pm_groups", "manage_pm_plans", "execute_pm_work"] },
  { id: "reports", title: "รายงาน KPI และประวัติ", description: "รายงาน สถิติ KPI, MTTR/MTBF, Backlog, History, Audit และการส่งออกข้อมูล", tokens: ["report", "kpi", "mttr", "mtbf", "backlog", "history", "audit", "export", "backup", "developer_system_log"] },
  { id: "communication", title: "การแจ้งเตือนและการสื่อสาร", description: "Notification, Announcement, LINE และ Feedback", tokens: ["notification", "announcement", "line", "feedback"] },
  { id: "configuration", title: "Organization, Site และการตั้งค่า", description: "โครงสร้างองค์กร ข้อมูล Site, Category, Zone, SLA, QR และการตั้งค่าระบบ", tokens: ["organization", "plant", "category", "zone", "qr_code", "system_setting", "sla", "work_status", "cross_plant"] },
] as const;

export function groupPermissionKeys(keys: readonly PermissionKey[]) {
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
