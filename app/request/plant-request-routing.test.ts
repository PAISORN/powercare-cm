import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plant-specific repair request routing", () => {
  it("redirects the general request URL to the canonical RTB request page", () => {
    const routeSource = readFileSync("app/request/page.tsx", "utf8");
    const source = readFileSync("app/request/request-page-content.tsx", "utf8");
    expect(routeSource).toContain('export { default } from "./request-page-content"');
    expect(source).toContain('permanentRedirect("/p/rtb/request")');
    expect(source).toContain("user?.plant?.code");
    expect(source).toContain("RoleName.ADMIN");
    expect(source).toContain('redirect("/dashboard")');
    expect(source).toContain('formData.get("plantCode")');
    expect(source).toContain('name="plantCode"');
    expect(source).toContain("plantName={plantScope.name}");
    expect(source).toContain("Site: {plantName}");
    expect(source).not.toContain("Plant: {plantName}");
    expect(source).toContain("db.zone.findMany");
    expect(source).toContain("db.category.findMany");
    expect(source).toContain("db.asset.findMany");
    expect(source).toContain("createRepairRequest({ ...parsed, plantCode, submissionKey })");
    expect(source).toContain('name="submissionKey"');
    expect(source).toContain("RequestSubmitButton");

    const submitButtonSource = readFileSync("components/request-submit-button.tsx", "utf8");
    expect(submitButtonSource).toContain('role="dialog"');
    expect(submitButtonSource).toContain("backdrop-blur-sm");
    expect(submitButtonSource).toContain("form.reportValidity()");
    expect(submitButtonSource).toContain('form.addEventListener("submit", interceptDirectSubmit)');
    expect(submitButtonSource).toContain("form.requestSubmit(submitButtonRef.current)");
    expect(submitButtonSource).toContain("กลับไปแก้ไข");
    expect(submitButtonSource).toContain("ยืนยันส่งแจ้งซ่อม");
  });

  it("adds a clean plant route for QR links", () => {
    expect(existsSync("app/p/[plantCode]/request/page.tsx")).toBe(true);
    const source = readFileSync("app/p/[plantCode]/request/page.tsx", "utf8");
    expect(source).toContain("RequestPageContent");
    expect(source).toContain("params");
    expect(source).toContain("plantCode");
    expect(source).toContain('dynamic = "force-dynamic"');
  });
});
