import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("RootLayout theme initialization", () => {
  it("renders a server-selected initial theme without an inline script", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>content</main>
      </RootLayout>,
    );

    expect(markup).toMatch(/<html[^>]+data-theme="(?:day|night)"/);
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
});
