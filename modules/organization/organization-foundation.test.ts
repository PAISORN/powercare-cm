import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_ORGANIZATION_SLUG,
  DEFAULT_PLANT_CODE,
  DEFAULT_PLANT_ID,
  normalizeOrganizationRecordInput,
  normalizePlantRecordInput,
} from "./organization-foundation";

describe("organization foundation", () => {
  it("defines stable default organization and plant identifiers for the single-plant migration step", () => {
    expect(DEFAULT_ORGANIZATION_ID).toBe("primary");
    expect(DEFAULT_ORGANIZATION_SLUG).toBe("primary");
    expect(DEFAULT_PLANT_ID).toBe("primary-plant");
    expect(DEFAULT_PLANT_CODE).toBe("main");
  });

  it("normalizes organization records", () => {
    expect(normalizeOrganizationRecordInput({ name: "  บริษัท ตัวอย่าง จำกัด  ", slug: " Main Plant " })).toEqual({
      name: "บริษัท ตัวอย่าง จำกัด",
      slug: "main-plant",
    });
  });

  it("normalizes plant records", () => {
    expect(normalizePlantRecordInput({ name: "  โรงไฟฟ้า 1  ", code: " Plant A " })).toEqual({
      name: "โรงไฟฟ้า 1",
      code: "plant-a",
    });
  });
});
