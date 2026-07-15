"use client";

import { Camera, Keyboard, ScanBarcode, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BarcodeStockOption = {
  stockKey: string;
  itemCode?: string | null;
  sparePartCode?: string;
  sparePartName?: string;
};

type DetectorResult = { rawValue: string };
type Detector = { detect(source: HTMLVideoElement): Promise<DetectorResult[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;

export function SparePartBarcodeScanner({
  onSelect,
  options,
}: {
  onSelect: (stockKey: string) => void;
  options: BarcodeStockOption[];
}) {
  const [open, setOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const onSelectRef = useRef(onSelect);
  const optionsRef = useRef(options);

  useEffect(() => {
    onSelectRef.current = onSelect;
    optionsRef.current = options;
  }, [onSelect, options]);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let frameId = 0;
    let stream: MediaStream | null = null;

    async function startCamera() {
      const DetectorApi = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
      if (!navigator.mediaDevices?.getUserMedia || !DetectorApi) {
        setMessage("อุปกรณ์นี้ไม่รองรับการสแกนด้วยกล้อง กรุณากรอกรหัสด้านล่าง");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!videoRef.current || stopped) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new DetectorApi({ formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code"] });

        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results[0]?.rawValue && chooseStock(results[0].rawValue, optionsRef.current, onSelectRef.current, setMessage)) {
              setOpen(false);
              return;
            }
          } catch {
            // Camera can yield an unreadable frame while focusing. Keep scanning.
          }
          frameId = window.requestAnimationFrame(scan);
        };
        frameId = window.requestAnimationFrame(scan);
      } catch {
        setMessage("เปิดกล้องไม่ได้ กรุณาอนุญาตใช้กล้องหรือกรอกรหัสด้านล่าง");
      }
    }

    void startCamera();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]);

  function submitManualCode() {
    if (chooseStock(manualCode, options, onSelect, setMessage)) {
      setManualCode("");
      setOpen(false);
    }
  }

  return (
    <>
      <button
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--primary)]/15"
        onClick={() => {
          setMessage("");
          setOpen(true);
        }}
        type="button"
      >
        <ScanBarcode aria-hidden="true" size={18} />
        สแกนบาร์โค้ต
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] grid items-end bg-slate-950/70 p-0 sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-label="สแกนบาร์โค้ตอะไหล่">
          <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-extrabold"><Camera aria-hidden="true" size={21} /> สแกนบาร์โค้ตอะไหล่</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">วางบาร์โค้ตให้อยู่กลางกรอบ กล้องจะเลือกอะไหล่อัตโนมัติ</p>
              </div>
              <button aria-label="ปิดตัวสแกน" className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--line)]" onClick={() => setOpen(false)} type="button">
                <X aria-hidden="true" size={19} />
              </button>
            </div>

            <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl bg-slate-950">
              <video className="size-full object-cover" muted playsInline ref={videoRef} />
              <div className="pointer-events-none absolute inset-[18%_9%] rounded-2xl border-2 border-cyan-300 shadow-[0_0_0_999px_rgba(2,6,23,.3)]" />
            </div>

            {message ? <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-300" role="status">{message}</p> : null}

            <div className="mt-4 grid gap-2">
              <label className="text-sm font-bold" htmlFor="manual-barcode">กรอกรหัสแทนการสแกน</label>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <span className="relative">
                  <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
                  <input
                    autoCapitalize="characters"
                    className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] pl-10 pr-3 uppercase text-[var(--ink)]"
                    id="manual-barcode"
                    onChange={(event) => setManualCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        submitManualCode();
                      }
                    }}
                    placeholder="Item code หรือรหัสอะไหล่"
                    value={manualCode}
                  />
                </span>
                <button className="min-h-12 rounded-xl bg-[var(--primary)] px-4 font-bold text-white" onClick={submitManualCode} type="button">เลือก</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function chooseStock(
  rawCode: string,
  options: BarcodeStockOption[],
  onSelect: (stockKey: string) => void,
  setMessage: (message: string) => void,
) {
  const code = normalizeCode(rawCode);
  if (!code) {
    setMessage("กรุณากรอกรหัสอะไหล่");
    return false;
  }
  const matches = options.filter((option) =>
    [option.itemCode, option.sparePartCode].some((candidate) => normalizeCode(candidate ?? "") === code),
  );
  if (!matches.length) {
    setMessage(`ไม่พบอะไหล่รหัส ${rawCode.trim()} ใน Site นี้ หรือสต๊อกไม่พร้อมเบิก`);
    return false;
  }
  onSelect(matches[0].stockKey);
  setMessage(`เลือก ${matches[0].sparePartName ?? rawCode.trim()} แล้ว`);
  return true;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}
