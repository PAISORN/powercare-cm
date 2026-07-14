import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE_ADMIN_CONFIGURABLE_PERMISSIONS } from "../modules/auth/site-admin-permissions";

describe("Permission context document", () => {
  it("keeps the Thai permission context readable", () => {
    const source = readFileSync("docs/Permission.md", "utf8");

    expect(source).toContain("เอกสารนี้เป็น context กลาง");
    expect(source).toContain("Owner Admin");
    expect(source).toContain("Organization Admin");
    expect(source).toContain("Site Admin");
    expect(source).not.toContain("à¸");
    expect(source).not.toContain("Â");
  });

  it("documents the scope guardrails needed before Store and Inventory are added", () => {
    const source = readFileSync("docs/Permission.md", "utf8");

    expect(source).toContain("Store / Inventory");
    expect(source).toContain("organizationId");
    expect(source).toContain("plantId");
    expect(source).toContain("ทุก query ที่แสดงข้อมูลต้องผ่าน scope ของ user");
    expect(source).toContain("ทุก server action/API ต้องตรวจ permission ก่อนแก้ข้อมูล");
  });

  it("documents every configurable Site Admin permission key", () => {
    const source = readFileSync("docs/Permission.md", "utf8");

    for (const permissionKey of SITE_ADMIN_CONFIGURABLE_PERMISSIONS) {
      expect(source).toContain(`\`${permissionKey}\``);
    }
  });
});
