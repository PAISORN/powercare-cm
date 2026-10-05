import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  Edit3,
  History,
  MoreVertical,
  SlidersHorizontal,
} from "lucide-react";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { ConfirmSubmitButton } from "../../../components/confirm-submit-button";
import { ExclusiveDetails } from "../../../components/exclusive-details";
import { PreserveListPositionLink } from "../../../components/preserve-list-position";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockBalanceRow } from "../../../modules/store/stock-read-service";
import { deleteSparePartFromStockAction } from "./actions";

type StockTablePermissions = {
  canAdjust: boolean;
  canIssue: boolean;
  canManageParts: boolean;
  canReceive: boolean;
  canViewValue: boolean;
};

type StockTableNavigation = {
  currentPage: number;
  sparePartEditHref: (sparePartId: string) => string;
  stockListPositionKey: string;
  stockPageHref: (page: number) => string;
};

export function StockTableRows({
  navigation,
  pagedStocks,
  permissions,
  scope,
  stockRowNumbers,
}: {
  navigation: StockTableNavigation;
  pagedStocks: StockBalanceRow[];
  permissions: StockTablePermissions;
  scope: AdminSiteScope;
  stockRowNumbers: Map<string, number>;
}) {
  const {
    currentPage,
    sparePartEditHref,
    stockListPositionKey,
    stockPageHref,
  } = navigation;
  const { canAdjust, canIssue, canManageParts, canReceive, canViewValue } =
    permissions;

  return pagedStocks.map((stock) => {
    const quantity = Number(stock.quantity);
    const unitPrice = Number(stock.sparePart.latestUnitPrice ?? 0);

    return (
      <tr
        className="bg-[var(--surface)] transition hover:bg-[var(--soft)]/80 [&>td]:border-b [&>td]:border-[var(--line)] last:[&>td]:border-b-0"
        id={`stock-row-${stock.sparePart.id}`}
        key={stock.id}
      >
        <td className="px-4 py-3 text-center">
          <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-[var(--soft)] px-2 py-1 font-mono text-xs font-extrabold text-[var(--primary)]">
            {stockRowNumbers.get(stock.id) ?? "-"}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--soft)] text-[var(--primary)]">
              <Boxes size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{stock.sparePart.name}</p>
              <p className="mt-1 font-mono text-xs font-extrabold text-[var(--primary)]">
                {stock.sparePart.code}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-xs font-bold">
          {stock.sparePart.itemCode ?? "-"}
        </td>
        <td className="px-4 py-3">
          <p className="font-bold">{stock.sparePart.category?.name ?? "-"}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {stock.sparePart.materialGroup?.name ?? "-"}
          </p>
        </td>
        <td className="px-4 py-3">
          <p className="font-mono font-bold">
            {stock.sparePart.type?.code ?? "-"}
          </p>
          {stock.sparePart.type?.name ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {stock.sparePart.type.name}
            </p>
          ) : null}
        </td>
        <td className="py-3 pl-4 pr-1">
          <p className="font-semibold">{stock.store.name}</p>
          <p className="text-xs text-[var(--muted)]">
            {stock.store.location ?? stock.store.code}
          </p>
        </td>
        <td className="py-3 pl-1 pr-3 text-right">
          <p className="font-extrabold">{formatQuantity(quantity)}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {stock.sparePart.unit}
          </p>
        </td>
        <td className="px-4 py-3 text-right">
          <p className="font-bold">
            {stock.sparePart.maxStock == null
              ? "-"
              : formatQuantity(Number(stock.sparePart.maxStock))}
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
            {formatQuantity(Number(stock.sparePart.minStock))}
          </p>
        </td>
        <td className="px-4 py-3">
          <StockStatusPill
            minStock={Number(stock.sparePart.minStock)}
            quantity={quantity}
          />
        </td>
        <td className="px-4 py-3 text-left font-semibold">
          {canViewValue ? formatMoney(quantity * unitPrice) : "-"}
        </td>
        <td className="px-2 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <div className="grid gap-1">
              {canIssue ? (
                <PreserveListPositionLink
                  className={issueRowActionClass}
                  href={`${stockPageHref(currentPage)}&stockAction=issue&stockId=${encodeURIComponent(stock.id)}#stock-action-drawer`}
                  storageKey={stockListPositionKey}
                  targetId={`stock-row-${stock.sparePart.id}`}
                >
                  <span className={rowActionIconClass}>
                    <ArrowUp size={14} />
                  </span>
                  <span className={rowActionLabelClass}>Issue</span>
                </PreserveListPositionLink>
              ) : null}
              {canReceive ? (
                <PreserveListPositionLink
                  className={receiveRowActionClass}
                  href={`${stockPageHref(currentPage)}&stockAction=receive&stockId=${encodeURIComponent(stock.id)}#stock-action-drawer`}
                  storageKey={stockListPositionKey}
                  targetId={`stock-row-${stock.sparePart.id}`}
                >
                  <span className={rowActionIconClass}>
                    <ArrowDown size={14} />
                  </span>
                  <span className={rowActionLabelClass}>Receive</span>
                </PreserveListPositionLink>
              ) : null}
              {canAdjust ? (
                <PreserveListPositionLink
                  className={adjustRowActionClass}
                  href={`${stockPageHref(currentPage)}&stockAction=adjust&stockId=${encodeURIComponent(stock.id)}#stock-action-drawer`}
                  storageKey={stockListPositionKey}
                  targetId={`stock-row-${stock.sparePart.id}`}
                >
                  <span className={rowActionIconClass}>
                    <SlidersHorizontal size={14} />
                  </span>
                  <span className={rowActionLabelClass}>Adjust</span>
                </PreserveListPositionLink>
              ) : null}
            </div>
            <ExclusiveDetails className="group relative">
              <summary
                aria-label={`จัดการ ${stock.sparePart.name}`}
                className="inline-flex size-7 shrink-0 cursor-pointer list-none items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden"
              >
                <MoreVertical size={18} />
              </summary>
              <div className="grid w-36 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 text-sm font-bold shadow-xl">
                <PreserveListPositionLink
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-[var(--ink)] transition hover:bg-[var(--soft)]"
                  href={`${stockPageHref(currentPage)}&historyStockId=${encodeURIComponent(stock.id)}#stock-row-${stock.sparePart.id}`}
                  storageKey={stockListPositionKey}
                  targetId={`stock-row-${stock.sparePart.id}`}
                >
                  <History size={15} />
                  ประวัติ
                </PreserveListPositionLink>
                {canManageParts ? (
                  <>
                    <PreserveListPositionLink
                      className="inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-[var(--ink)] transition hover:bg-[var(--soft)]"
                      href={sparePartEditHref(stock.sparePart.id)}
                      storageKey={stockListPositionKey}
                      targetId={`stock-row-${stock.sparePart.id}`}
                    >
                      <Edit3 size={15} />
                      แก้ไข
                    </PreserveListPositionLink>
                    <form action={deleteSparePartFromStockAction}>
                      <AdminScopeHiddenFields scope={scope} />
                      <input
                        name="returnTo"
                        type="hidden"
                        value={stockPageHref(currentPage)}
                      />
                      <input
                        name="sparePartId"
                        type="hidden"
                        value={stock.sparePart.id}
                      />
                      <ConfirmSubmitButton
                        className="inline-flex min-h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-red-600 transition hover:bg-red-500/10"
                        message={`ต้องการลบอะไหล่ ${stock.sparePart.name} หรือไม่?`}
                      >
                        ลบ
                      </ConfirmSubmitButton>
                    </form>
                  </>
                ) : null}
              </div>
            </ExclusiveDetails>
          </div>
        </td>
      </tr>
    );
  });
}

function StockStatusPill({
  quantity,
  minStock,
}: {
  quantity: number;
  minStock: number;
}) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-extrabold text-red-600">
        <AlertTriangle size={14} />
        หมดสต็อก
      </span>
    );
  }
  if (quantity <= minStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-extrabold text-orange-600">
        <AlertTriangle size={14} />
        ใกล้หมด
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-600">
      <CheckCircle2 size={14} />
      เพียงพอ
    </span>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

const rowActionBaseClass =
  "inline-flex min-h-8 w-[4.75rem] items-center justify-start gap-1 rounded-full px-2 text-xs font-extrabold transition hover:-translate-y-0.5 hover:text-white";
const issueRowActionClass = `${rowActionBaseClass} bg-red-500/10 text-red-600 hover:bg-red-600`;
const receiveRowActionClass = `${rowActionBaseClass} bg-blue-500/10 text-blue-700 hover:bg-blue-600 dark:text-blue-300`;
const adjustRowActionClass = `${rowActionBaseClass} bg-violet-500/10 text-violet-700 hover:bg-violet-600 dark:text-violet-300`;
const rowActionIconClass =
  "inline-flex w-4 shrink-0 items-center justify-center";
const rowActionLabelClass =
  "min-w-0 flex-1 whitespace-nowrap text-left leading-none";
