import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin system settings page contract", () => {
  const filePath = path.join(process.cwd(), "app/admin/settings/page.tsx");

  it("guards the page and mutation as Admin-only", () => {
    expect(fs.existsSync(filePath)).toBe(true);
    if (!fs.existsSync(filePath)) return;
    const source = fs.readFileSync(filePath, "utf8");
    expect(source).toContain("requireUser");
    expect(source).toContain("user.role !== RoleName.ADMIN");
    expect(source).toContain("updateEngineerAssignmentSetting");
  });

  it("submits the engineer assignment checkbox", () => {
    expect(fs.existsSync(filePath)).toBe(true);
    if (!fs.existsSync(filePath)) return;
    const source = fs.readFileSync(filePath, "utf8");
    expect(source).toContain('name="engineerWorkAssignmentEnabled"');
    expect(source).toContain('formData.get("engineerWorkAssignmentEnabled") === "on"');
  });
});
