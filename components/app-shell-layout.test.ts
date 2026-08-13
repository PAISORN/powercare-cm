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

  it("keeps the mobile primary tabs above immersive Store forms", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/app-shell.tsx"), "utf8");
    const mobileNavSource = fs.readFileSync(path.join(process.cwd(), "components/mobile-primary-nav.tsx"), "utf8");

    expect(source).toContain("<MobilePrimaryNav elevated={immersiveMobile}");
    expect(mobileNavSource).toContain('elevated?"z-[250]":"z-50"');
    expect(mobileNavSource).toContain('href="/request"');
    expect(mobileNavSource).toContain('aria-label="แจ้งซ่อม"');
    expect(mobileNavSource).toContain("grid-cols-[1fr_1fr_4.5rem_1fr_1fr]");
    expect(mobileNavSource).toContain('homeHref === "/dashboardstore"');
    expect(mobileNavSource).toContain("mobile-primary-nav-surface");
    expect(mobileNavSource).toContain("C 201 1 206 9 206 20");
    expect(mobileNavSource).toContain("A 44 44 0 0 0 294 20");
    expect(mobileNavSource).toContain("top-3 grid size-16");
  });
});
