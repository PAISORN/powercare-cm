import { existsSync, readFileSync } from "node:fs";
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

  test("global styles define a full-height right-aligned gear cluster for all pages", () => {
    const css = readProjectFile("app/globals.css");
    const artworkPath = join(root, "public/gear-cluster.svg");

    expect(existsSync(artworkPath)).toBe(true);
    const artwork = readFileSync(artworkPath, "utf8");

    expect(css).toContain("body::before");
    expect(css).toContain('background-image: url("/gear-cluster.svg")');
    expect(css).toContain("background-position: right center");
    expect(css).toContain("background-size: contain");
    expect(css).toContain("width: min(92vw, 1800px)");
    expect(css).toContain("height: 100dvh");
    expect(css).toContain("background-repeat: no-repeat");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain('[data-theme="night"]');
    expect(artwork).toContain('id="gear-large"');
    expect(artwork).toContain('id="gear-medium"');
    expect(artwork).toContain('id="gear-small"');
    expect(artwork).toContain('id="gear-hole"');
    expect(artwork).toContain('mask="url(#gear-hole)"');
    expect(artwork).toContain("translate(330 410) scale(3.45)");
  });
});
