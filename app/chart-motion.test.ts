import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("chart entry motion", () => {
  test("public and dashboard charts use shared motion hooks", () => {
    for (const path of ["app/page.tsx", "app/dashboard/page.tsx"]) {
      const content = readProjectFile(path);

      expect(content).toContain("cm-donut-motion");
      expect(content).toContain("cm-donut-core");
      expect(content).toContain("cm-monthly-bar");
      expect(content).toContain("cm-zone-fill");
    }
  });

  test("global styles define chart motion with reduced-motion fallback", () => {
    const css = readProjectFile("app/globals.css");

    expect(css).toContain("@keyframes cm-donut-enter");
    expect(css).toContain("@keyframes cm-bar-enter");
    expect(css).toContain("@keyframes cm-zone-fill-enter");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
