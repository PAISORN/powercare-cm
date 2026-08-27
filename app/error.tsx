"use client";

import { SystemErrorPopup, friendlyErrorMessage } from "../components/system-error-popup";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SystemErrorPopup message={friendlyErrorMessage(error.message)} onClose={reset} />
    </div>
  );
}
