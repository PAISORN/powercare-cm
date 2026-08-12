import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";
import { themeBootScript } from "./theme-boot-script";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("RootLayout theme boot script", () => {
  it("keeps a saved-theme initializer available to the root layout", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>content</main>
      </RootLayout>,
    );

    expect(themeBootScript).toContain("cm-theme-mode");
    expect(themeBootScript).toContain("document.documentElement.dataset.theme");
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
});
