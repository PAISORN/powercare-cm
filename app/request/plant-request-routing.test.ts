import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Plant-specific repair request routing", () => {
  it("keeps the general request page compatible while submitting plant code when provided", () => {
    const source = readFileSync("app/request/page.tsx", "utf8");
    expect(source).toContain("searchParams");
    expect(source).toContain('formData.get("plantCode")');
    expect(source).toContain('name="plantCode"');
    expect(source).toContain("plantName={plantScope.name}");
    expect(source).toContain("Site: {plantName}");
    expect(source).not.toContain("Plant: {plantName}");
    expect(source).toContain("getActiveZonesForScope(plantScope.id)");
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
  });
});
