import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = [
  "app/assets/master-data/page.tsx",
  "app/assets/master-data/actions.ts",
]
  .map((file) => fs.readFileSync(path.join(process.cwd(), file), "utf8"))
  .join("\n");
const newAssetSource = fs.readFileSync(
  path.join(process.cwd(), "app/assets/new/page.tsx"),
  "utf8",
);
const editAssetSource = fs.readFileSync(
  path.join(process.cwd(), "app/assets/[id]/edit/page.tsx"),
  "utf8",
);
const assetTechnicalInputSource = fs.readFileSync(
  path.join(process.cwd(), "components/asset-technical-field-input.tsx"),
  "utf8",
);

describe("Asset Master Data simplified names", () => {
  it("uses one bilingual name or label input instead of translated pairs", () => {
    expect(source).toContain('name="name"');
    expect(source).toContain('name="label"');
    expect(source).not.toMatch(/name="(?:nameTh|nameEn|labelTh|labelEn)"/);
    expect(source).toContain('placeholder="ชื่อ (ไทยหรืออังกฤษ)"');
    expect(source).toContain('placeholder="ชื่อฟิลด์ (ไทยหรืออังกฤษ)"');
  });

  it("stores the single value as the canonical name and clears duplicate translations", () => {
    expect(source).toContain("nameTh: name, nameEn: null");
    expect(source).toContain("labelTh: label");
    expect(source).toContain("labelEn: null");
  });

  it("keeps technical code, data type, and unit fields while generating the internal key", () => {
    expect(source).toContain('name="code"');
    expect(source).not.toContain('name="key"');
    expect(source).not.toContain('placeholder="rated_power"');
    expect(source).toContain("key: generateTechnicalFieldKey(label)");
    expect(source).toContain("crypto.randomUUID()");
    expect(source).toContain("TechnicalFieldConfig");
    expect(source).toContain('value="SELECT"');
    expect(source).toContain(
      'serializeTechnicalOptions(formData.get("options"))',
    );
    expect(source).toContain(
      'serializeTechnicalOptions(formData.get("options"))',
    );
    expect(source).toContain('name="unit"');
    expect(source).toContain('name="helpText"');
    expect(source).not.toContain('name="sortOrder"');
    expect(source).toContain("sortOrder: (lastField._max.sortOrder ?? -1) + 1");
  });

  it("shows template guidance when users enter technical values", () => {
    expect(newAssetSource).toContain("AssetTechnicalFieldInput");
    expect(editAssetSource).toContain("AssetTechnicalFieldInput");
    expect(assetTechnicalInputSource).toContain('field.dataType === "SELECT"');
    expect(assetTechnicalInputSource).toContain("parseAssetTechnicalOptions");
    expect(assetTechnicalInputSource).toContain(
      "placeholder={field.helpText || undefined}",
    );
    expect(assetTechnicalInputSource).toContain("{field.helpText}");
  });

  it("keeps Part Asset Types out of Technical Field Templates", () => {
    expect(source).toMatch(
      /types\.filter\(\s*\(type\) => type\.defaultLevel !== "PART",?\s*\)/,
    );
    expect(source).toContain('assetType.defaultLevel === "PART"');
    expect(source).toContain("technicalFieldTypes.map");
  });

  it("opens Technical Field editing in a right-side drawer without losing list position", () => {
    expect(source).toContain("TechnicalFieldTree");
    expect(source).toContain("editFieldId");
    expect(source).toContain("newFieldTypeId");
    expect(source).toContain("TechnicalFieldCreateDrawer");
    expect(source).toContain("PreserveListPositionLink");
    expect(source).toContain("PreserveListPositionForm");
    expect(source).toContain("RestoreListPosition");
    expect(source).toContain(
      'className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm"',
    );
    expect(source).toContain('className="fixed inset-y-0 right-0 z-50');
    expect(source).toContain('aria-label="ปิด Technical Field"');
  });
});
