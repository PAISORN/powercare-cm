import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Permission Center categories", () => {
  const source = readFileSync("app/admin/permissions/page.tsx", "utf8");

  it("groups the permission switches into named sections", () => {
    expect(source).toContain("groupPermissionKeys(permissionKeys)");
    expect(source).toContain("Store และ Inventory");
    expect(source).toContain("งานซ่อมและขั้นตอนดำเนินงาน");
    expect(source).toContain("ผู้ใช้ Role และการมอบหมายสิทธิ์");
    expect(source).toContain("Permission categories");
    expect(source).toContain("thaiPermissionDescription(key)");
    expect(source).toContain("อนุญาตให้");
    expect(source).toContain("md:grid-cols-2 xl:grid-cols-3");
    expect(source).toContain("<fieldset");
  });
});
