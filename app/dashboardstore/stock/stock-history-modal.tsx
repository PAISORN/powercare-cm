import { History, PackageSearch, X } from "lucide-react";
import Link from "next/link";
import { ActivityTimelineRow } from "../../../components/activity-timeline-row";
import type { StockMovementHistory } from "../../../modules/store/stock-movement-history";
import { StockMovementType } from "../../../modules/store/store-types";

export function StockHistoryModal({
  closeHref,
  history,
}: {
  closeHref: string;
  history: StockMovementHistory;
}) {
  const { movements, stock } = history;
  const chronologicalMovements = [...movements].reverse();

  return (
    <div className="fixed inset-0 z-[210] grid place-items-center p-3 sm:p-6">
      <Link
        aria-label="ปิดประวัติกิจกรรม Stock"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
        href={closeHref}
        scroll={false}
      />
      <section
        aria-labelledby="stock-history-title"
        aria-modal="true"
        className="relative z-10 flex max-h-[min(88vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/60 bg-[var(--surface)] shadow-2xl"
        role="dialog"
      >
        <header className="flex items-start gap-3 border-b border-[var(--line)] px-5 py-5 sm:px-7">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-600">
            <History size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
              Stock activity history
            </p>
            <h2
              className="mt-1 truncate text-xl font-black sm:text-2xl"
              id="stock-history-title"
            >
              {stock.sparePart.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {stock.sparePart.code}
              {stock.sparePart.itemCode ? ` · ${stock.sparePart.itemCode}` : ""}
              {` · ${stock.store.code} · ${stock.store.name}`}
            </p>
          </div>
          <Link
            aria-label="ปิด"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--muted)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            href={closeHref}
            scroll={false}
          >
            <X size={20} />
          </Link>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {movements.length ? (
            <section aria-labelledby="stock-activity-history-heading">
              <h3
                className="mb-5 inline-flex items-center gap-2 text-xl font-extrabold"
                id="stock-activity-history-heading"
              >
                <History className="text-[var(--primary)]" size={22} />
                ประวัติกิจกรรม
              </h3>
              <ol className="grid gap-0" data-testid="stock-activity-timeline">
              {chronologicalMovements.map((movement, index) => {
                const presentation = movementPresentation(
                  movement.movementType,
                  Number(movement.quantityChange),
                );
                return (
                  <ActivityTimelineRow
                    active={index === chronologicalMovements.length - 1}
                    actor={movement.actor?.fullName ?? "ไม่ระบุ"}
                    detail={
                      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 rounded-xl bg-[var(--soft)] px-3 py-2 text-sm">
                        <div className="min-w-0">
                          {movement.note ? (
                            <p className="break-words">{movement.note}</p>
                          ) : null}
                          {movement.refType || movement.refId ? (
                            <p className="mt-1 truncate font-mono text-[11px] text-[var(--muted)]">
                              {[movement.refType, movement.refId]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-black ${presentation.quantityClass}`}>
                            {formatSignedQuantity(Number(movement.quantityChange))}{" "}
                            {stock.sparePart.unit}
                          </p>
                          <p className="text-xs font-semibold text-[var(--muted)]">
                            คงเหลือ {formatQuantity(Number(movement.balanceAfter ?? 0))}
                          </p>
                          {movement.unitPrice != null ? (
                            <p className="text-xs text-[var(--muted)]">
                              {formatMoney(Number(movement.unitPrice))} / {stock.sparePart.unit}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    }
                    key={movement.id}
                    time={movement.occurredAt}
                    title={presentation.label}
                  />
                );
              })}
              </ol>
            </section>
          ) : (
            <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-[var(--line)] p-8 text-center">
              <div>
                <PackageSearch
                  className="mx-auto text-[var(--muted)]"
                  size={42}
                />
                <p className="mt-3 font-extrabold">ยังไม่มีประวัติกิจกรรม</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  รายการรับเข้า เบิกจ่าย และปรับยอดจะแสดงที่นี่
                </p>
              </div>
            </div>
          )}
        </div>
        <footer className="border-t border-[var(--line)] px-5 py-3 text-xs font-semibold text-[var(--muted)] sm:px-7">
          แสดงกิจกรรมล่าสุดสูงสุด 100 รายการของอะไหล่และคลังนี้
        </footer>
      </section>
    </div>
  );
}

function movementPresentation(type: string, quantity: number) {
  if (type === StockMovementType.RECEIVE) {
    return {
      label: "รับเข้า",
      quantityClass: "text-emerald-600",
    };
  }
  if (type === StockMovementType.ISSUE) {
    return {
      label: "เบิกจ่าย",
      quantityClass: "text-rose-600",
    };
  }
  return {
    label: quantity >= 0 ? "ปรับเพิ่ม" : "ปรับลด",
    quantityClass: "text-violet-600",
  };
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatSignedQuantity(value: number) {
  return `${value > 0 ? "+" : ""}${formatQuantity(value)}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(value);
}
