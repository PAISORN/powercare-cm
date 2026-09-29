import { ArrowLeft, ClipboardCheck, Send } from "lucide-react";
import type { IssueZoneOption } from "./issue-line-items-editor";
import {
  stockForKey,
  type IssueLine,
  type StockOption,
} from "./issue-stock-selector";

export function IssueReviewModal({
  isSubmitting,
  issueZones,
  lines,
  onBack,
  stocks,
}: {
  isSubmitting: boolean;
  issueZones: IssueZoneOption[];
  lines: IssueLine[];
  onBack: () => void;
  stocks: StockOption[];
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <section className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
          <h3 className="flex items-center gap-2 text-lg font-extrabold">
            <span className="text-[var(--primary)]">
              <ClipboardCheck size={19} />
            </span>
            ยืนยันรายการเบิกอะไหล่
          </h3>
        </div>
        <div className="grid gap-3 p-4 sm:p-5">
          {lines.map((line, index) => {
            const stock = stockForKey(stocks, line.stockKey);
            const zone = issueZones.find((item) => item.id === line.zoneId);
            return (
              <article
                className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-4 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center"
                key={line.id}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-extrabold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-extrabold">
                    {stock?.sparePartName ?? stock?.label ?? "-"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    รหัส {stock?.sparePartCode ?? stock?.itemCode ?? "-"} ·{" "}
                    {stock?.storeName ?? "-"} · Zone{" "}
                    {zone ? zone.code + " " + zone.name : "-"}
                  </p>
                </div>
                <p className="font-extrabold text-[var(--primary)]">
                  {line.requestedQty || "0"} {stock?.unit ?? ""}
                </p>
              </article>
            );
          })}
          <div className="mt-2 flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-end">
            <button
              className={secondaryButtonClass}
              disabled={isSubmitting}
              onClick={onBack}
              type="button"
            >
              <ArrowLeft size={18} /> ย้อนกลับไปแก้ไข
            </button>
            <button
              aria-busy={isSubmitting}
              className={primaryButtonClass}
              disabled={isSubmitting}
              type="submit"
            >
              <Send size={18} /> ยืนยันการเบิก
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold hover:border-[var(--primary)] hover:text-[var(--primary)]";
const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 font-bold text-white hover:-translate-y-0.5 hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-45";
