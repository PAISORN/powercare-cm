"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isPlainPrimaryClick(event: MouseEvent) {
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

/**
 * Keeps query-driven controls (tabs, views and filters) at the user's current
 * scroll position. Full page navigation retains Next.js' normal scroll policy.
 */
export function NavigationExperience() {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !isPlainPrimaryClick(event)) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      const isSameDocumentQueryChange =
        destination.origin === current.origin &&
        destination.pathname === current.pathname &&
        destination.hash === current.hash &&
        destination.search !== current.search;

      if (!isSameDocumentQueryChange) return;

      event.preventDefault();
      router.push(`${destination.pathname}${destination.search}${destination.hash}`, { scroll: false });
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;

      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.method.toLowerCase() !== "get" || form.target || form.dataset.nativeNavigation === "true") return;

      const destination = new URL(form.action || window.location.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.origin !== current.origin) return;

      destination.search = "";
      const formData = new FormData(form);
      for (const [name, value] of formData.entries()) {
        if (typeof value === "string") destination.searchParams.append(name, value);
      }

      event.preventDefault();
      const staysOnPage = destination.pathname === current.pathname;
      router.push(`${destination.pathname}${destination.search}${destination.hash}`, { scroll: !staysOnPage });
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("submit", handleSubmit);
    };
  }, [router]);

  return null;
}
