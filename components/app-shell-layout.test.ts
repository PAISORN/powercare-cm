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
    const desktopSidebarSource = fs.readFileSync(path.join(process.cwd(), "components/desktop-sidebar.tsx"), "utf8");

    expect(source).toContain("<DesktopSidebar");
    expect(desktopSidebarSource).toContain("h-screen");
    expect(desktopSidebarSource).toContain("flex-col");
    expect(desktopSidebarSource).toContain("md:flex");
    expect(desktopSidebarSource).toContain('data-testid="desktop-sidebar-nav"');
    expect(desktopSidebarSource).toContain("min-h-0 flex-1");
    expect(desktopSidebarSource).toContain("overflow-y-auto");
  });

  it("keeps the top app bar visible while the page scrolls", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");

    expect(source).toContain("ops-topbar fixed");
    expect(source).toContain("z-40");
    expect(source).toContain("backdrop-blur");
    expect(source).toContain("data-app-top-bar");
    expect(source).toContain("data-app-top-bar-spacer");
  });

  it("keeps the mobile primary tabs above immersive Store forms", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");
    const mobileNavSource = fs.readFileSync(path.join(process.cwd(), "components/mobile-primary-nav.tsx"), "utf8");

    expect(source).toContain("<MobilePrimaryNav elevated={immersiveMobile}");
    expect(mobileNavSource).toContain('elevated?"z-[250]":"z-50"');
    expect(mobileNavSource).toContain('{ href: "/dashboardstore", label: "Store"');
  });
});
