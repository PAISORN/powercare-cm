import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  PackageSearch,
  Scale,
  X,
} from "lucide-react";
import Link from "next/link";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
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

        <div className="overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
          {movements.length ? (
            <ol className="grid gap-3">
              {movements.map((movement) => {
                const presentation = movementPresentation(
                  movement.movementType,
                  Number(movement.quantityChange),
                );
                return (
                  <li
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)]/65 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                    key={movement.id}
                  >
                    <span
                      className={`grid size-10 place-items-center rounded-xl ${presentation.iconClass}`}
                    >
                      {presentation.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${presentation.badgeClass}`}
                        >
                          {presentation.label}
                        </span>
                        <span className="text-xs font-semibold text-[var(--muted)]">
                          {formatThaiMediumDateTime(movement.occurredAt)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        ผู้ดำเนินการ: {movement.actor?.fullName ?? "ไม่ระบุ"}
                      </p>
                      {movement.note ? (
                        <p className="mt-1 break-words text-sm text-[var(--muted)]">
                          {movement.note}
                        </p>
                      ) : null}
                      {movement.refType || movement.refId ? (
                        <p className="mt-1 truncate font-mono text-[11px] text-[var(--muted)]">
                          {[movement.refType, movement.refId]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="col-start-2 text-left sm:col-start-auto sm:text-right">
                      <p
                        className={`text-lg font-black ${presentation.quantityClass}`}
                      >
                        {formatSignedQuantity(Number(movement.quantityChange))}{" "}
                        {stock.sparePart.unit}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                        คงเหลือ{" "}
                        {formatQuantity(Number(movement.balanceAfter ?? 0))}
                      </p>
                      {movement.unitPrice != null ? (
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {formatMoney(Number(movement.unitPrice))} /{" "}
                          {stock.sparePart.unit}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
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
      icon: <ArrowDownToLine size={19} />,
      iconClass: "bg-emerald-500/12 text-emerald-600",
      badgeClass: "bg-emerald-500/12 text-emerald-700",
      quantityClass: "text-emerald-600",
    };
  }
  if (type === StockMovementType.ISSUE) {
    return {
      label: "เบิกจ่าย",
      icon: <ArrowUpFromLine size={19} />,
      iconClass: "bg-rose-500/12 text-rose-600",
      badgeClass: "bg-rose-500/12 text-rose-700",
      quantityClass: "text-rose-600",
    };
  }
  return {
    label: quantity >= 0 ? "ปรับเพิ่ม" : "ปรับลด",
    icon: <Scale size={19} />,
    iconClass: "bg-violet-500/12 text-violet-600",
    badgeClass: "bg-violet-500/12 text-violet-700",
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
