import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CM completion document print flow", () => {
  it("opens the print preview in a new tab", () => {
    const source = readFileSync("app/work/[id]/page.tsx", "utf8");
    const printLink = source.match(/<Link[\s\S]*?href=\{`\/work\/\$\{work\.id\}\/print`\}[\s\S]*?>/u)?.[0];

    expect(printLink).toContain('target="_blank"');
    expect(printLink).toContain('rel="noreferrer"');
  });

  it("shows a print and PDF action above the completed CM document", () => {
    const source = readFileSync("app/work/[id]/print/page.tsx", "utf8");

    expect(source).toContain('<PrintButton label="พิมพ์ / บันทึก PDF" />');
    expect(source).toContain("print:hidden");
    expect(source).toContain("<CompletionDocument");
  });
});