"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { friendlyErrorMessage, SystemErrorPopup } from "./system-error-popup";

const errorKeys = ["error", "importError"] as const;

export function QueryErrorPopup() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeKey = errorKeys.find((key) => searchParams.has(key));
  const rawMessage = activeKey ? searchParams.get(activeKey) : null;
  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    errorKeys.forEach((key) => params.delete(key));
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}${window.location.hash}`, { scroll: false });
  }, [pathname, router, searchParams]);

  if (!activeKey) return null;
  return <SystemErrorPopup message={friendlyErrorMessage(rawMessage)} onClose={close} />;
}
