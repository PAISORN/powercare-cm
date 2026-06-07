"use client";

import { useState } from "react";

export function SignaturePreview() {
  const [src, setSrc] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      <input
        accept="image/png,image/jpeg"
        name="signature"
        required
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setSrc(file ? URL.createObjectURL(file) : null);
        }}
      />
      {src ? (
        <div className="rounded-md border border-[var(--line)] bg-white p-4">
          <img alt="Signature preview" className="max-h-28 object-contain" src={src} />
        </div>
      ) : null}
    </div>
  );
}
