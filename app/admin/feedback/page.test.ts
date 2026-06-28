import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AdminFeedbackPage", () => {
  it("is admin only and reads public feedback records", () => {
    const source = readFileSync("app/admin/feedback/page.tsx", "utf8");

    expect(source).toContain("user.role !== RoleName.ADMIN");
    expect(source).toContain("db.publicFeedback.findMany");
    expect(source).toContain("ความคิดเห็น / คำแนะนำ");
  });
});
