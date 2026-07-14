import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AdminSlaPage", () => {
  it("uses the SLA permission helper for the page and server action", () => {
    const source = readFileSync("app/admin/sla/page.tsx", "utf8");

    expect(source).toContain("canManageSlaDueDate");
    expect(source).toContain("if (!canManageSlaDueDate(user)) redirect");
    expect(source).not.toContain("user.role !== RoleName.ADMIN");
  });
});
