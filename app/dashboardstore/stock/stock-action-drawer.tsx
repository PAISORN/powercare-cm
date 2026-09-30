import Link from "next/link";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockPageData } from "../../../modules/store/stock-page-data";
import type { StockBalanceRow } from "../../../modules/store/stock-read-service";
import {
  StockAdjustForm,
  StockIssueForm,
  StockReceiveForm,
} from "./stock-action-forms";

export function StockActionDrawer({
  currentPage,
  issueZones,
  scope,
  selectedStock,
  stockAction,
  stockPageHref,
}: {
  currentPage: number;
  issueZones: StockPageData["issueZones"];
  scope: AdminSiteScope;
  selectedStock: StockBalanceRow;
  stockAction: "issue" | "receive" | "adjust";
  stockPageHref: (page: number) => string;
}) {
  const formProps = {
    currentPage,
    scope,
    selectedStock,
    stockPageHref,
  };

  return (
    <>
      <Link
        aria-label="ปิดหน้าต่างดำเนินการ Stock"
        className="fixed inset-0 z-[75] bg-black/35 backdrop-blur-sm"
        href={`${stockPageHref(currentPage)}#stock-row-${selectedStock.sparePart.id}`}
        scroll={false}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[80] w-full max-w-lg overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-6"
        id="stock-action-drawer"
      >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--primary)]">
            {stockAction === "issue"
              ? "Issue Stock"
              : stockAction === "receive"
                ? "Receive Stock"
                : "Adjust Stock"}
          </p>
          <h2 className="mt-1 text-2xl font-extrabold">
            {selectedStock.sparePart.name}
          </h2>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
            {selectedStock.sparePart.code}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {selectedStock.store.name} · คงเหลือ{" "}
            {formatQuantity(Number(selectedStock.quantity))}{" "}
            {selectedStock.sparePart.unit}
          </p>
        </div>
        <Link
          className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold"
          href={`${stockPageHref(currentPage)}#stock-row-${selectedStock.sparePart.id}`}
          scroll={false}
        >
          ปิด
        </Link>
      </div>

      {stockAction === "issue" ? (
        <StockIssueForm {...formProps} issueZones={issueZones} />
      ) : null}
      {stockAction === "receive" ? <StockReceiveForm {...formProps} /> : null}
      {stockAction === "adjust" ? <StockAdjustForm {...formProps} /> : null}
      </aside>
    </>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}
