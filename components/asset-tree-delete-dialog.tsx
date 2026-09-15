"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";
import type { AssetTreeItem } from "./asset-tree-workspace";

export type TreeAssetDeleteState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export type TreeAssetDeleteAction = (
  previousState: TreeAssetDeleteState,
  formData: FormData,
) => Promise<TreeAssetDeleteState>;

const initialState: TreeAssetDeleteState = { status: "idle" };

export function AssetTreeDeleteDialog({
  action,
  asset,
  organizationId,
  plantId,
  onClose,
}: {
  action: TreeAssetDeleteAction;
  asset: AssetTreeItem;
  organizationId: string;
  plantId: string;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (state.status === "success") onClose();
  }, [onClose, state.status]);

  return <>
    <button aria-label="ปิดหน้าต่างยืนยันลบ" className="fixed inset-0 z-[80] cursor-default bg-slate-950/40 backdrop-blur-sm" onClick={onClose} type="button"/>
    <section aria-labelledby="asset-delete-dialog-title" aria-modal="true" className="fixed left-1/2 top-1/2 z-[90] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-rose-200 bg-white text-slate-900 shadow-2xl" role="alertdialog">
      <header className="flex items-start justify-between gap-4 border-b border-rose-100 bg-rose-50 px-5 py-4 sm:px-6">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700"><AlertTriangle size={22}/></span>
          <div><p className="text-xs font-black uppercase tracking-[.14em] text-rose-700">ยืนยันการลบ</p><h2 className="mt-1 text-xl font-black" id="asset-delete-dialog-title">แน่ใจว่าต้องการลบ Asset นี้หรือไม่?</h2></div>
        </div>
        <button aria-label="ปิด" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white" onClick={onClose} type="button"><X size={20}/></button>
      </header>
      <form action={formAction}>
        <input name="assetId" type="hidden" value={asset.id}/>
        <input name="organizationId" type="hidden" value={organizationId}/>
        <input name="plantId" type="hidden" value={plantId}/>
        <div className="grid gap-4 px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-mono text-sm font-black text-rose-700">{asset.code}</p>
            <p className="mt-1 font-bold">{asset.name}</p>
          </div>
          <p className="text-sm text-slate-600">รายการจะถูกนำออกจากทะเบียน แต่ประวัติ CM/PM และ Audit เดิมจะยังคงอยู่</p>
          {state.status === "error" ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700" role="alert">{state.message}</p> : null}
          <label className="grid gap-1.5 text-sm font-bold">รหัสผ่านของคุณ
            <input autoComplete="current-password" autoFocus className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15" name="password" placeholder="กรอกรหัสผ่านเพื่อยืนยัน" required type="password"/>
          </label>
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 sm:px-6">
          <button className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:bg-slate-50" onClick={onClose} type="button">ยกเลิก</button>
          <DeleteButton/>
        </footer>
      </form>
    </section>
  </>;
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return <button className="flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit"><Trash2 size={17}/>{pending ? "กำลังลบ..." : "ยืนยันลบ Asset"}</button>;
}
