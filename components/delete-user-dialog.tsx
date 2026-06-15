"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useState } from "react";

type DeleteUserDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  fullName: string;
  userId: string;
  username: string;
};

export function DeleteUserDialog({ action, fullName, userId, username }: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={`Delete ${username}`}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Trash2 aria-hidden="true" size={16} />
        ลบ User
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-100">
                <AlertTriangle aria-hidden="true" size={30} />
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)]" onClick={() => setOpen(false)} type="button" aria-label="Close delete dialog">
                <X aria-hidden="true" size={17} />
              </button>
            </div>

            <h2 className="mt-5 text-2xl font-extrabold">ต้องการลบ User จริงหรือไม่?</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              User: <strong className="text-[var(--ink)]">{fullName}</strong> ({username}) จะถูกลบออกจากระบบ และประวัติการลบจะถูกบันทึกไว้
            </p>

            <form action={action} className="mt-5 grid gap-3">
              <input name="userId" type="hidden" value={userId} />
              <label className="grid gap-1 text-sm font-semibold">
                กรอกรหัสผ่าน Admin เพื่อยืนยัน
                <input
                  autoComplete="current-password"
                  name="adminPassword"
                  required
                  type="password"
                  className="rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3 text-[var(--ink)]"
                />
              </label>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <button className="rounded-xl border border-[var(--line)] px-4 py-2 font-bold" onClick={() => setOpen(false)} type="button">
                  ยกเลิก
                </button>
                <button aria-label="Confirm delete user" className="rounded-xl bg-red-600 px-4 py-2 font-bold text-white shadow-sm" type="submit">
                  ยืนยันลบ User
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
