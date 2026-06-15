"use client";

import { Camera } from "lucide-react";
import { useState } from "react";

export function ProfilePhotoPreview() {
  const [src, setSrc] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--soft)] px-4 py-5 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]">
        <Camera aria-hidden="true" size={18} />
        เลือกรูปโปรไฟล์ PNG/JPG/WebP
        <input
          accept="image/png,image/jpeg,image/webp"
          name="profilePhoto"
          type="file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setSrc(file ? URL.createObjectURL(file) : null);
          }}
        />
      </label>
      {src ? (
        <div className="flex items-center gap-3 rounded-2xl bg-[var(--soft)] p-3">
          <img alt="Profile preview" className="h-16 w-16 rounded-full object-cover ring-4 ring-white" src={src} />
          <span className="text-sm font-semibold text-[var(--muted)]">Preview รูปใหม่ก่อนบันทึก</span>
        </div>
      ) : null}
    </div>
  );
}
