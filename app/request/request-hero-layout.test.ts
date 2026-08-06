import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("repair request hero", () => {
  it("uses the same plain dark-background identity layout as the issue form", () => {
    const source = readFileSync("app/request/request-page-content.tsx", "utf8");

    expect(source).toContain('data-testid="repair-request-hero"');
    expect(source).toContain("<Wrench");
    expect(source).toContain("PowerCare CM · {label}");
    expect(source).toContain("เปิดรับแจ้งซ่อม");
    expect(source).not.toContain('className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]"');
  });
});
