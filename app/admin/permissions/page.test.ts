import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync("app/admin/permissions/page.tsx", "utf8");
const actionSource = readFileSync("app/admin/permissions/actions.ts", "utf8");
const dataSource = readFileSync("modules/auth/permission-center-page-data.ts", "utf8");
const modelSource = readFileSync("modules/auth/permission-center-page-model.ts", "utf8");
const workspaceSource = readFileSync("components/admin-permissions-page/permission-center-workspace.tsx", "utf8");
const source = [routeSource, actionSource, dataSource, modelSource, workspaceSource].join("\n");

describe("Permission Center architecture", () => {
  it("keeps the route as a thin adapter", () => {
    expect(routeSource).toContain("getPermissionCenterPageData");
    expect(routeSource).toContain("PermissionCenterWorkspace");
    expect(routeSource).not.toContain("db.");
    expect(routeSource).not.toContain('"use server"');
  });

  it("groups permission switches and keeps Thai descriptions in the model", () => {
    expect(workspaceSource).toContain("Permission categories");
    expect(modelSource).toContain("Store และ Inventory");
    expect(modelSource).toContain("งานซ่อมและขั้นตอนดำเนินงาน");
    expect(modelSource).toContain("ผู้ใช้ Role และการมอบหมายสิทธิ์");
    expect(modelSource).toContain('{ id: "pm", title: "Preventive Maintenance"');
    expect(modelSource).toContain("thaiPermissionDescription");
  });

  it("supports explicit Owner PM grants and scoped changed-key persistence", () => {
    expect(actionSource).toContain('const scopeKey = isOwnerRole ? "SYSTEM"');
    expect(actionSource).toContain("isOwnerRole ? [PermissionKey.EXECUTE_PM_WORK] : permissionKeys");
    expect(actionSource).toContain('formData.get(`permission:${permissionKey}`) ?? "INHERIT"');
    expect(modelSource).toContain('formData.getAll("changedPermissionKeys")');
    expect(actionSource).toContain("permissionKey: { in: changedKeys }");
    expect(actionSource).not.toContain("tx.userPermissionOverride.deleteMany({ where: { userId } })");
  });

  it("presents INHERIT separately from the effective permission", () => {
    expect(dataSource).toContain("resolvePermissionPresentation");
    expect(modelSource).toContain('overrideDecision: PermissionDecision | "INHERIT"');
    expect(workspaceSource).toContain("inheritedAllowed");
    expect(workspaceSource).toContain("initialDecision");
    expect(actionSource).toContain("postSaveUserOverrides");
    expect(actionSource).toContain("effectiveAllowed(PermissionKey.APPROVE_STORE_ISSUE)");
  });

  it("keeps inventory scope and permission audit data together", () => {
    expect(actionSource).toContain("inventoryScopeSignature");
    expect(actionSource).toContain("inventoryScopes: beforeScopes");
    expect(actionSource).toContain("inventoryScopes: scopeRows");
    expect(source).toContain("activePermissionTargetWhere(userId, plantId)");
  });
});
