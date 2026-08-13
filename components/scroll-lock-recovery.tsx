"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Clears a stale modal scroll lock after login redirects or route changes. */
export function ScrollLockRecovery() {
  const pathname = usePathname();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const activeOverlay = document.querySelector('[data-body-scroll-lock="true"]');
      if (activeOverlay) return;

      if (document.body.style.overflow === "hidden") {
        document.body.style.removeProperty("overflow");
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
