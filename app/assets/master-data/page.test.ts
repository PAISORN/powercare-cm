import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.join(process.cwd(), "app/assets/master-data/page.tsx"), "utf8");

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

  it("keeps technical code, key, data type, and unit fields", () => {
    expect(source).toContain('name="code"');
    expect(source).toContain('name="key"');
    expect(source).toContain('name="dataType"');
    expect(source).toContain('name="unit"');
  });
});
