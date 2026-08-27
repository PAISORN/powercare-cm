"use client";

import type { ComponentProps } from "react";
import { useEffect } from "react";
import Link from "next/link";

type StoredListPosition = {
  scrollY: number;
  targetId: string;
  savedAt: number;
};

const storagePrefix = "powercare:list-position:";
const maxAgeMs = 30 * 60 * 1000;

export function PreserveListPositionLink({
  storageKey,
  targetId,
  onClick,
  scroll = false,
  ...props
}: ComponentProps<typeof Link> & { storageKey: string; targetId: string }) {
  return (
    <Link
      {...props}
      scroll={scroll}
      onClick={(event) => {
        try {
          const value: StoredListPosition = { scrollY: window.scrollY, targetId, savedAt: Date.now() };
          window.sessionStorage.setItem(`${storagePrefix}${storageKey}`, JSON.stringify(value));
        } catch {
          // The row anchor remains a safe fallback when session storage is unavailable.
        }
        onClick?.(event);
      }}
    />
  );
}

export function RestoreListPosition({ storageKey, enabled }: { storageKey: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const key = `${storagePrefix}${storageKey}`;
    let stored: StoredListPosition | null = null;
    try {
      stored = JSON.parse(window.sessionStorage.getItem(key) ?? "null") as StoredListPosition | null;
      window.sessionStorage.removeItem(key);
    } catch {
      window.sessionStorage.removeItem(key);
    }
    if (!stored || Date.now() - stored.savedAt > maxAgeMs) return;

    window.requestAnimationFrame(() => {
      if (Number.isFinite(stored?.scrollY)) {
        window.scrollTo({ top: stored.scrollY, behavior: "auto" });
      }
      const target = document.getElementById(stored?.targetId ?? "");
      if (!target) return;
      const bounds = target.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > window.innerHeight) {
        target.scrollIntoView({ block: "center", behavior: "auto" });
      }
    });
  }, [enabled, storageKey]);

  return null;
}
