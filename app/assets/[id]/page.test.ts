import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Asset image upload", () => {
  it("shows an explicit save image button for editable Assets", () => {
    const source = readFileSync("app/assets/[id]/page.tsx", "utf8");
    expect(source).toContain("บันทึกรูปภาพ");
    expect(source).toContain('type="submit"');
    expect(source).toContain('aria-label="เลือกรูปภาพ Asset"');
    expect(source).toContain("form action={uploadAssetImage}");
  });
});
