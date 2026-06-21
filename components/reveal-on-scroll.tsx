"use client";

import { useLayoutEffect } from "react";

const revealSelector = [
  "main section:not([data-reveal-ignore])",
  "main article:not([data-reveal-ignore])",
  "main form:not([data-reveal-ignore])",
  "[data-reveal-section]:not([data-reveal-ignore])",
].join(",");

export function RevealOnScroll() {
  useLayoutEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const canObserve = !reducedMotion && typeof IntersectionObserver !== "undefined";
    const observer = canObserve
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const element = entry.target as HTMLElement;
              element.dataset.revealed = "true";
              observer?.unobserve(element);
            }
          },
          { threshold: 0.01 },
        )
      : null;

    function register(element: HTMLElement, index = 0) {
      if (element.dataset.scrollReveal === "true") return;
      element.dataset.scrollReveal = "true";
      element.style.setProperty("--cm-reveal-delay", `${Math.min(index, 4) * 70}ms`);
      if (!observer) {
        element.dataset.revealed = "true";
        return;
      }
      element.dataset.revealed = "false";
      observer.observe(element);
    }

    function registerWithin(root: ParentNode) {
      Array.from(root.querySelectorAll<HTMLElement>(revealSelector)).forEach(register);
    }

    registerWithin(document);
    const mutationObserver =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver((records) => {
            for (const record of records) {
              for (const node of record.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.matches(revealSelector)) register(node);
                registerWithin(node);
              }
            }
          });
    mutationObserver?.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver?.disconnect();
      observer?.disconnect();
    };
  }, []);

  return null;
}
