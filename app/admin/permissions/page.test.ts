import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Permission Center categories", () => {
  const source = readFileSync("app/admin/permissions/page.tsx", "utf8");

  it("groups the permission switches into named sections", () => {
    expect(source).toContain("groupPermissionKeys(visiblePermissionKeys)");
    expect(source).toContain("Store และ Inventory");
    expect(source).toContain("งานซ่อมและขั้นตอนดำเนินงาน");
    expect(source).toContain("ผู้ใช้ Role และการมอบหมายสิทธิ์");
    expect(source).toContain("Permission categories");
    expect(source).toContain("thaiPermissionDescription(key)");
    expect(source).toContain('{ id: "pm", title: "Preventive Maintenance"');
    expect(source).toContain('"execute_pm_work"');
    expect(source).toContain("อนุญาตให้");
    expect(source).toContain('value === PermissionKey.VIEW_MY_ACTIVITIES');
    expect(source).toContain('"view_my_activities"');
    expect(source).toContain('value === PermissionKey.VIEW_MY_ACTIVITIES_CM');
    expect(source).toContain('value === PermissionKey.VIEW_MY_ACTIVITIES_STORE');
    expect(source).toContain("งาน CM ที่ตนรับผิดชอบหรือต้องตรวจรับ");
    expect(source).toContain("ใบเบิก Store ที่ตนต้องอนุมัติ");
    expect(source).toContain('value === PermissionKey.EDIT_WORK_TITLE');
    expect(source).toContain("แก้ไขชื่อใบแจ้งซ่อมจากหน้า All Work");
    expect(source).toContain("md:grid-cols-2 xl:grid-cols-3");
    expect(source).toContain("<fieldset");
  });

  it("offers only the explicit PM execution grant for Owner Admin at SYSTEM scope", () => {
    expect(source).toContain('const scopeKey = isOwnerRole ? "SYSTEM"');
    expect(source).toContain("isOwnerRole ? [PermissionKey.EXECUTE_PM_WORK] : permissionKeys");
    expect(source).toContain("const changedKeys = changedPermissionKeys(formData, editablePermissionKeys)");
    expect(source).toContain("organizationId: isOwnerRole ? null : organizationId");
    expect(source).toContain("Owner Admin ใช้สิทธิ์ระดับระบบ");
    expect(source).toContain("const actor = await requireOwner()");
  });

  it("supports a narrowly scoped individual Owner Admin PM execution override", () => {
    expect(source).toContain("activePermissionTargetWhere(userId, plantId)");
    expect(source).toContain("const isOwnerTarget = target.role === RoleName.ADMIN");
    expect(source).toContain("const editablePermissionKeys = editableUserPermissionKeys(target.role)");
    expect(source).toContain("permissionKeys: changedKeys");
    expect(source).toContain("const rows = buildUserPermissionOverrideRows");
    expect(source).toContain('const visiblePermissionKeys = effectiveRole === RoleName.ADMIN');
    expect(source).toContain('mode === "user" && effectiveRole !== RoleName.ADMIN');
  });

  it("preserves unrelated Owner Admin overrides and inventory scope on save", () => {
    expect(source).not.toContain("tx.userPermissionOverride.deleteMany({ where: { userId } })");
    expect(source).toContain("where: { userId, permissionKey: { in: changedKeys } }");
    expect(source).toContain("if (!isOwnerTarget) {");
    expect(source).toContain("await tx.userInventoryScope.deleteMany({ where: { userId } })");
  });

  it("persists only permission switches changed in the submitted form", () => {
    expect(source).toContain('formData.getAll("changedPermissionKeys")');
    expect(source).toContain("permissionKey: { in: changedKeys }");
    expect(source).toContain("const rows = changedKeys.flatMap");
    expect(source).toContain("permissionKeys: changedKeys");
    expect(source).not.toContain("role, permissionKey: { in: editablePermissionKeys }");
  });
});
