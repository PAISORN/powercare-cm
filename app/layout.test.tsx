import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout, { themeBootScript } from "./layout";

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
});
