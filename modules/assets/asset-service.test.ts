import { describe, expect, it } from "vitest";
import { isAllowedAssetCode, normalizeAssetTypeCode } from "./asset-service";

describe("Asset Code standard", () => {
  it("accepts a standard generated code", () => {
    expect(isAllowedAssetCode("MC-PMP-001")).toBe(true);
  });

  it("accepts only the seven approved ARC exceptions", () => {
    expect(isAllowedAssetCode("MC-ARC-5001")).toBe(true);
    expect(isAllowedAssetCode("MC-ARC-5007")).toBe(true);
    expect(isAllowedAssetCode("MC-ARC-5008")).toBe(false);
  });

  it("rejects legacy and malformed codes", () => {
    expect(isAllowedAssetCode("RTB-BFP-A01")).toBe(false);
    expect(isAllowedAssetCode("MC-PUMP-001")).toBe(false);
  });

  it("normalizes valid three-letter Asset Type codes", () => {
    expect(normalizeAssetTypeCode(" pmp ")).toBe("PMP");
    expect(() => normalizeAssetTypeCode("PUMP")).toThrow(/3/);
  });
});