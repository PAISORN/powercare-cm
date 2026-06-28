"use client";

import { Download, ExternalLink, Printer } from "lucide-react";

export function QrCodeActions({ qrImageUrl, requestUrl }: { qrImageUrl: string; requestUrl: string }) {
  return (
    <div className="flex flex-wrap gap-3 print:hidden">
      <a
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]"
        href={requestUrl}
        rel="noreferrer"
        target="_blank"
      >
        <ExternalLink size={17} />
        เปิดหน้าแจ้งซ่อม
      </a>
      <a
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold transition hover:bg-[var(--soft)]"
        download="powercare-general-request-qr.svg"
        href={qrImageUrl}
      >
        <Download size={17} />
        ดาวน์โหลด QR
      </a>
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-bold transition hover:bg-[var(--soft)]"
        type="button"
        onClick={() => window.print()}
      >
        <Printer size={17} />
        พิมพ์ QR
      </button>
    </div>
  );
}
