import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("system-wide error handling", () => {
  it("mounts the query popup once at the root layout", () => {
    const layout = readFileSync("app/layout.tsx", "utf8");
    const popup = readFileSync("components/query-error-popup.tsx", "utf8");

    expect(layout).toContain("<QueryErrorPopup />");
    expect(layout).toContain("<ClientRuntimeErrorPopup />");
    expect(layout).toContain("<Suspense fallback={null}>");
    expect(popup).toContain('["error", "importError"]');
    expect(popup).toContain("router.replace");
    expect(popup).toContain("{ scroll: false }");
  });

  it("uses the same popup for runtime errors and missing routes", () => {
    const errorPage = readFileSync("app/error.tsx", "utf8");
    const notFoundPage = readFileSync("app/not-found.tsx", "utf8");
    const globalErrorPage = readFileSync("app/global-error.tsx", "utf8");

    expect(errorPage).toContain("<SystemErrorPopup");
    expect(errorPage).toContain("onClose={reset}");
    expect(notFoundPage).toContain("<SystemErrorPopup");
    expect(notFoundPage).toContain("router.back()");
    expect(notFoundPage).not.toContain("404");
    expect(globalErrorPage).toContain("<SystemErrorPopup");
  });
});
