"use client";

import { SystemErrorPopup, friendlyErrorMessage } from "../components/system-error-popup";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="th">
      <body>
        <SystemErrorPopup message={friendlyErrorMessage(error.message)} onClose={reset} />
      </body>
    </html>
  );
}
