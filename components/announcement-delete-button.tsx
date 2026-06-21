"use client";

import { Trash2 } from "lucide-react";

export function AnnouncementDeleteButton() {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-500/45 px-3 text-sm font-bold text-red-600 transition hover:bg-red-500/10"
      name="intent"
      onClick={(event) => {
        if (!window.confirm("ต้องการลบประกาศนี้จริงหรือไม่?")) event.preventDefault();
      }}
      type="submit"
      value="delete"
    >
      <Trash2 aria-hidden="true" size={16} />
      ลบ
    </button>
  );
}
