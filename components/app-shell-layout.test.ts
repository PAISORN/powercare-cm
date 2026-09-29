import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("AppShell mobile header", () => {
  it("keeps document scrolling enabled outside an active overlay", () => {
    const globalCss = fs.readFileSync(
      path.join(process.cwd(), "app/globals.css"),
      "utf8",
    );
    const bodyRule = globalCss.match(/^body\s*\{([\s\S]*?)\}/m)?.[1] ?? "";

    expect(bodyRule).toContain("overflow-x: hidden");
    expect(bodyRule).not.toMatch(/(?:^|\s)overflow:\s*hidden/);
  });

  it("keeps compact navigation controls on mobile after removing the app bar", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/app-shell.tsx"),
      "utf8",
    );

    expect(source).toContain("<MobileAppDrawer");
    expect(source).toContain("<NotificationBell");
    expect(source).toContain("<ThemeToggle compact />");
    expect(source).toContain("data-mobile-app-controls");
    expect(source).not.toContain("data-app-top-bar");
  });

  it("keeps the desktop identity fixed while navigation scrolls", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/app-shell.tsx"),
      "utf8",
    );
    const desktopSidebarSource = fs.readFileSync(
      path.join(process.cwd(), "components/desktop-sidebar.tsx"),
      "utf8",
    );

    expect(source).toContain("<DesktopSidebar");
    expect(source).toContain("<ScrollLockRecovery />");
    expect(desktopSidebarSource).toContain("h-screen");
    expect(desktopSidebarSource).toContain("flex-col");
    expect(desktopSidebarSource).toContain("md:flex");
    expect(desktopSidebarSource).toContain('data-testid="desktop-sidebar-nav"');
    expect(desktopSidebarSource).toContain("treeStyle");
    expect(desktopSidebarSource).toContain("min-h-0 flex-1");
    expect(desktopSidebarSource).toContain("overflow-y-auto");
  });

  it("removes the desktop dashboard switcher and its reserved spacer", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/app-shell.tsx"),
      "utf8",
    );

    expect(source).not.toContain("ops-topbar fixed");
    expect(source).not.toContain("data-app-top-bar");
    expect(source).not.toContain("data-app-top-bar-spacer");
    expect(source).not.toContain("DashboardTypeNav");
  });

  it("recovers stale body scroll locks after navigation", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/scroll-lock-recovery.tsx"),
      "utf8",
    );

    expect(source).toContain("usePathname()");
    expect(source).toContain('document.body.style.overflow === "hidden"');
    expect(source).toContain('data-body-scroll-lock="true"');
    expect(source).toContain('removeProperty("overflow")');
  });

  it("moves dashboard switching into the sidebar Dashboard submenu", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/app-navigation/app-navigation-model.ts"),
      "utf8",
    );

    expect(source).toContain('label: "Dashboard CM"');
    expect(source).toContain('label: "Dashboard PM"');
    expect(source).toContain('label: "Dashboard Store"');
    expect(source).toContain('parentSectionId: "dashboard"');
  });

  it("temporarily hides the complete mobile primary navigation and releases its reserved space", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "components/app-shell.tsx"),
      "utf8",
    );

    expect(source).not.toContain('from "./mobile-primary-nav"');
    expect(source).not.toContain("<MobilePrimaryNav");
    expect(source).not.toContain("pb-28");
  });
});
