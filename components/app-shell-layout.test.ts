import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AppShell mobile header", () => {
  it("places the menu control before Home", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");
    const menuIndex = source.indexOf("<MobileAppDrawer");
    const homeIndex = source.indexOf('aria-label="Home"');

    expect(menuIndex).toBeGreaterThan(-1);
    expect(homeIndex).toBeGreaterThan(menuIndex);
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

  it("keeps the top app bar visible while the page scrolls", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");

    expect(source).toContain("sticky top-3");
    expect(source).toContain("z-40");
    expect(source).toContain("backdrop-blur");
  });
});
