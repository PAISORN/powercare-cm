import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";
const { currentUser, preferences } = vi.hoisted(() => ({ currentUser: vi.fn(), preferences: vi.fn() }));
vi.mock("../lib/session", () => ({ getCurrentUser: currentUser }));
vi.mock("../modules/settings/display-preferences-service", () => ({ getUserDisplayPreferences: preferences }));
beforeEach(() => { vi.clearAllMocks(); currentUser.mockResolvedValue(null); });

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("RootLayout theme initialization", () => {
  it("renders only the signed-in account preferences and exposes its owner for the theme toggle", async () => {
    currentUser.mockResolvedValue({ id: "account-A" });
    preferences.mockResolvedValue({ theme: "night", background: "image-control-room", backgroundBlur: 3, backgroundBrightness: 82, language: "th" });
    const markup = renderToStaticMarkup(await RootLayout({ children: <main>content</main> }));
    expect(preferences).toHaveBeenCalledWith("account-A");
    expect(markup).toContain('data-background="image-control-room"');
    expect(markup).toContain('data-preference-user="account-A"');
    expect(markup).toContain('data-theme="night"');
  });
  it("renders server-selected preferences without an inline script", async () => {
    const layout = await RootLayout({ children: <main>content</main> });
    const markup = renderToStaticMarkup(layout);

    expect(markup).toMatch(/<html[^>]+data-theme="(?:day|night)"/);
    expect(markup).toContain('data-theme-preference="auto"');
    expect(markup).toContain('data-background="image-maintenance"');
    expect(markup).not.toContain("theme-boot");
    expect(markup).not.toContain("<script");
    expect(markup).toContain("<body>");
  });

  it("suppresses hydration warnings caused by extensions mutating body attributes", () => {
    const source = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");

    expect(source).toContain("<body suppressHydrationWarning>");
  });

  it("uses stable navigation feedback instead of hiding all page sections during route changes", () => {
    const source = readFileSync(join(process.cwd(), "app/layout.tsx"), "utf8");

    expect(source).toContain("<NavigationExperience />");
    expect(source).not.toContain("<RevealOnScroll />");
  });

  it("clips the decorative public Store issue background at the page boundary", () => {
    const source = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

    expect(source).toMatch(/\.issue-request-page-gradient\s*\{[^}]*overflow-x:\s*clip;/s);
  });
});
