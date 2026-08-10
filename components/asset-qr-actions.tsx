"use client";

import { useState } from "react";
import { Download, ExternalLink, Printer } from "lucide-react";

export type AssetQrDetails = { code: string; assetClass: string; assetType: string; assetFamily: string; assetName: string };

export function buildAssetQrDetailRows(details: AssetQrDetails) {
  return [["รหัสเครื่องจักร", details.code], ["Asset Class", details.assetClass], ["Asset Type", details.assetType], ["Asset Family", details.assetFamily], ["ชื่อเครื่องจักร", details.assetName]] as const;
}

export function AssetQrActions({ image, url, code, details }: { image: string; url: string; code: string; details?: AssetQrDetails }) {
  const [downloading, setDownloading] = useState(false);
  const labelDetails = details ?? { code, assetClass: "-", assetType: "-", assetFamily: "-", assetName: "-" };
  async function downloadQrLabel() {
    setDownloading(true);
    try {
      const qrImage = await loadImage(image);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available");
      canvas.width = 900; canvas.height = 1280;
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#052e2b"; context.textAlign = "center"; context.font = "700 38px Tahoma, 'Noto Sans Thai', sans-serif";
      context.fillText("QR Code ประจำเครื่อง", canvas.width / 2, 64);
      context.imageSmoothingEnabled = false; context.drawImage(qrImage, 140, 92, 620, 620); context.imageSmoothingEnabled = true;
      context.strokeStyle = "#d1d5db"; context.lineWidth = 2; context.beginPath(); context.moveTo(80, 750); context.lineTo(820, 750); context.stroke();
      context.textAlign = "left"; let y = 806;
      for (const [label, value] of buildAssetQrDetailRows(labelDetails)) {
        context.fillStyle = "#64748b"; context.font = "600 25px Tahoma, 'Noto Sans Thai', sans-serif"; context.fillText(label, 80, y); y += 34;
        context.fillStyle = "#0f172a"; context.font = "700 30px Tahoma, 'Noto Sans Thai', sans-serif"; y = drawWrappedText(context, value || "-", 80, y, 740, 38) + 30;
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Unable to create QR label");
      const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = `${safeFileName(code)}-qr-label.png`; anchor.click(); URL.revokeObjectURL(objectUrl);
    } finally { setDownloading(false); }
  }
  return <div className="flex flex-wrap gap-2 print:hidden"><a className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700" href={url} target="_blank" rel="noreferrer"><ExternalLink size={17}/>เปิดหน้า Public</a><button type="button" disabled={downloading} onClick={downloadQrLabel} className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold hover:bg-[var(--soft)] disabled:cursor-wait disabled:opacity-60"><Download size={17}/>{downloading ? "กำลังสร้างไฟล์..." : "ดาวน์โหลด QR"}</button><button type="button" onClick={()=>window.print()} className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold hover:bg-[var(--soft)]"><Printer size={17}/>พิมพ์</button></div>;
}

function loadImage(source: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("Unable to load QR image")); image.src = source; }); }
function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) { const words = text.split(/\s+/); let line = ""; for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (context.measureText(candidate).width > maxWidth && line) { context.fillText(line, x, y); line = word; y += lineHeight; } else line = candidate; } context.fillText(line, x, y); return y; }
function safeFileName(value: string) { return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "asset"; }
