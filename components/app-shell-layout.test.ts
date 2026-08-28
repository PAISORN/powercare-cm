import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AppShell mobile header", () => {
  it("places the menu control before Dashboard", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");
    const menuIndex = source.indexOf("<MobileAppDrawer");
    const homeIndex = source.indexOf('aria-label="Dashboard"');

    expect(menuIndex).toBeGreaterThan(-1);
    expect(homeIndex).toBeGreaterThan(menuIndex);
    expect(source).toContain('className="grid size-10 place-items-center rounded-full bg-[var(--primary)]');
  });

  it("keeps the desktop identity fixed while navigation scrolls", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");
    const desktopSidebarSource = fs.readFileSync(path.join(process.cwd(), "components/desktop-sidebar.tsx"), "utf8");

    expect(source).toContain("<DesktopSidebar");
    expect(source).toContain("<ScrollLockRecovery />");
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
    expect(source).toContain("<ThemeToggle compact />");
    expect(source).toContain("<DashboardTypeNav />");
    expect(source).toContain("<DashboardTypeNav mobile />");
    expect(source).toContain('<div className="md:hidden"><DashboardTypeNav mobile /></div>');
  });

  it("recovers stale body scroll locks after navigation", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/scroll-lock-recovery.tsx"), "utf8");

    expect(source).toContain("usePathname()");
    expect(source).toContain('document.body.style.overflow === "hidden"');
    expect(source).toContain('data-body-scroll-lock="true"');
    expect(source).toContain('removeProperty("overflow")');
  });

  it("keeps dashboard switching in the responsive navbar", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/dashboard-type-nav.tsx"), "utf8");

    expect(source).toContain('href="/dashboardcm"');
    expect(source).toContain('href="/dashboardstore"');
    expect(source).toContain('aria-label="ประเภท Dashboard"');
    expect(source).toContain('aria-label="เปิดเมนูประเภท Dashboard"');
    expect(source).toContain("MoreVertical");
  });

  it("temporarily hides the complete mobile primary navigation and releases its reserved space", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");

    expect(source).not.toContain('from "./mobile-primary-nav"');
    expect(source).not.toContain("<MobilePrimaryNav");
    expect(source).not.toContain("pb-28");
  });
});
