"use client";

import { useEffect, useState } from "react";
import { friendlyErrorMessage, SystemErrorPopup } from "./system-error-popup";

export function ClientRuntimeErrorPopup() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setMessage(friendlyErrorMessage(event.error instanceof Error ? event.error.message : event.message));
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      setMessage(friendlyErrorMessage(reason instanceof Error ? reason.message : String(reason ?? "")));
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return message ? <SystemErrorPopup message={message} onClose={() => setMessage(null)} /> : null;
}
