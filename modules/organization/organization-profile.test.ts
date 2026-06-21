import { describe, expect, it } from "vitest";
import { normalizeOrganizationInput, organizationFallback } from "./organization-profile";

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
});
