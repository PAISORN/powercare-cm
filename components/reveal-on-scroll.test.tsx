import fs from "node:fs";
import path from "node:path";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RevealOnScroll } from "./reveal-on-scroll";

let intersectionCallback: IntersectionObserverCallback;
let observerOptions: IntersectionObserverInit | undefined;
const observe = vi.fn();
const unobserve = vi.fn();
const disconnect = vi.fn();

class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    intersectionCallback = callback;
    observerOptions = options;
  }

  observe = observe;
  unobserve = unobserve;
  disconnect = disconnect;
}

describe("RevealOnScroll", () => {
  beforeEach(() => {
    observerOptions = undefined;
    observe.mockClear();
    unobserve.mockClear();
    disconnect.mockClear();
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });

  it("uses a low threshold so tall work-list sections can reveal", () => {
    render(
      <main>
        <section>Long work results</section>
        <RevealOnScroll />
      </main>,
    );

    expect(observerOptions?.threshold).toBe(0.01);
  });

  it("registers semantic content nested anywhere inside main", () => {
    render(
      <main>
        <div>
          <div>
            <div>
              <article>Nested result card</article>
            </div>
          </div>
        </div>
        <RevealOnScroll />
      </main>,
    );

    const card = screen.getByText("Nested result card").closest("article") as HTMLElement;
    expect(card.dataset.revealed).toBe("false");
    expect(observe).toHaveBeenCalledWith(card);
  });

  it("does not register content explicitly excluded from reveal", () => {
    render(
      <main>
        <section data-reveal-ignore>Stable content</section>
        <RevealOnScroll />
      </main>,
    );

    const section = screen.getByText("Stable content").closest("section") as HTMLElement;
    expect(section.dataset.scrollReveal).toBeUndefined();
    expect(observe).not.toHaveBeenCalledWith(section);
  });

  it("defines mobile and print-safe reveal behavior", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");

    expect(css).toMatch(/opacity 550ms ease-out/);
    expect(css).toMatch(/transform 550ms ease-out/);
    expect(css).toMatch(/\[data-scroll-reveal="true"\]\[data-revealed="true"\]\s*\{[^}]*transform: none/);
    expect(css).toMatch(/@media \(max-width: 640px\)[\s\S]*--cm-reveal-distance: 10px/);
    expect(css).toMatch(/@media print[\s\S]*\[data-scroll-reveal="true"\][\s\S]*opacity: 1/);
  });

  it("staggers nearby sections by 70 milliseconds", () => {
    render(
      <main>
        <section>First panel</section>
        <section>Second panel</section>
        <RevealOnScroll />
      </main>,
    );

    const secondPanel = screen.getByText("Second panel").closest("section") as HTMLElement;
    expect(secondPanel.style.getPropertyValue("--cm-reveal-delay")).toBe("70ms");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("reveals each main section once when it intersects", () => {
    render(
      <main>
        <section>Dashboard panel</section>
        <form aria-label="Request form">Request fields</form>
        <RevealOnScroll />
      </main>,
    );

    const panel = screen.getByText("Dashboard panel").closest("section") as HTMLElement;
    expect(panel.dataset.revealed).toBe("false");
    expect(observe).toHaveBeenCalledWith(panel);
    const form = screen.getByRole("form", { name: "Request form" });
    expect(form.dataset.revealed).toBe("false");
    expect(observe).toHaveBeenCalledWith(form);

    act(() => intersectionCallback([{ isIntersecting: true, target: panel } as unknown as IntersectionObserverEntry], {} as IntersectionObserver));

    expect(panel.dataset.revealed).toBe("true");
    expect(unobserve).toHaveBeenCalledWith(panel);
  });

  it("shows sections immediately when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    render(
      <main>
        <section>Reduced motion panel</section>
        <RevealOnScroll />
      </main>,
    );

    expect(screen.getByText("Reduced motion panel").closest("section")?.getAttribute("data-revealed")).toBe("true");
    expect(observe).not.toHaveBeenCalled();
  });
});
