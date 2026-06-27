import { describe, expect, it } from "vitest";
import { formatOrganizationDashboardTitle, normalizeOrganizationInput, organizationFallback } from "./organization-profile";

describe("organization profile", () => {
  it("normalizes the company name", () => {
    expect(
      normalizeOrganizationInput({
        companyName: "  บริษัท รุ่งทิวา ไบโอแมส จำกัด  ",
      }),
    ).toEqual({ companyName: "บริษัท รุ่งทิวา ไบโอแมส จำกัด" });
  });

  it("rejects an empty company name", () => {
    expect(() => normalizeOrganizationInput({ companyName: " " })).toThrow("Company name is required");
  });

  it("provides the document fallback", () => {
    expect(organizationFallback.companyName).toBe("PowerCare.CM");
  });

  it("builds the dashboard title from the configured organization name", () => {
    expect(formatOrganizationDashboardTitle("โรงไฟฟ้า รุ่งทิวา ไบโอแมส จำกัด")).toBe(
      "ภาพรวมงานซ่อม โรงไฟฟ้า รุ่งทิวา ไบโอแมส จำกัด",
    );
  });
});
