import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AppShell mobile header", () => {
  it("places the menu control before Home", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");
    const controlsStart = source.indexOf('<div className="flex shrink-0 items-center gap-2">');
    const controlsEnd = source.indexOf('<div className="min-w-0">', controlsStart);
    const leadingControls = source.slice(controlsStart, controlsEnd);

    expect(controlsStart).toBeGreaterThan(-1);
    expect(controlsEnd).toBeGreaterThan(controlsStart);
    expect(leadingControls.indexOf("<MobileAppDrawer")).toBeLessThan(leadingControls.indexOf('<Link className="grid h-10'));
  });

  it("keeps the desktop identity fixed while navigation scrolls", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");

    expect(source).toContain("h-screen");
    expect(source).toContain("flex-col");
    expect(source).toContain("md:flex");
    expect(source).toContain('data-testid="desktop-sidebar-nav"');
    expect(source).toContain("min-h-0 flex-1");
    expect(source).toContain("overflow-y-auto");
  });
});
