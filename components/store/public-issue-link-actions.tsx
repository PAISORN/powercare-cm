"use client";

import { Check, Copy, Download, ExternalLink, Printer } from "lucide-react";
import { useState } from "react";

export function PublicIssueLinkActions({
  enabled,
  qrDataUrl,
  requestUrl,
  siteCode,
}: {
  enabled: boolean;
  qrDataUrl: string;
  requestUrl: string;
  siteCode: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(requestUrl);
    } catch {
      const input = document.createElement("textarea");
      input.value = requestUrl;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
        disabled={!enabled}
        onClick={copyLink}
        type="button"
      >
        {copied ? <Check aria-hidden="true" size={17} /> : <Copy aria-hidden="true" size={17} />}
        {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
      </button>
      <a
        aria-disabled={!enabled}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold ${enabled ? "hover:bg-[var(--soft)]" : "pointer-events-none opacity-45"}`}
        href={requestUrl}
        rel="noreferrer"
        target="_blank"
      >
        <ExternalLink aria-hidden="true" size={17} /> เปิดหน้าสาธารณะ
      </a>
      <a
        aria-disabled={!enabled}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold ${enabled ? "hover:bg-[var(--soft)]" : "pointer-events-none opacity-45"}`}
        download={`powercare-issue-public-${siteCode.toLowerCase()}.png`}
        href={qrDataUrl}
      >
        <Download aria-hidden="true" size={17} /> ดาวน์โหลด QR
      </a>
      <button className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold hover:bg-[var(--soft)]" onClick={() => window.print()} type="button">
        <Printer aria-hidden="true" size={17} /> พิมพ์ QR
      </button>
    </div>
  );
}
