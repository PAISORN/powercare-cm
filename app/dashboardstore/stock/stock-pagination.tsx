import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { paginationWindow } from "../../../lib/pagination-window";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockListQuery } from "../../../modules/store/stock-list-query";
import { StockListStateFields } from "./stock-list-state-fields";

export function StockPagination({
  currentPage,
  pageEnd,
  pageStart,
  scope,
  stockPageHref,
  stockQuery,
  totalItems,
  totalPages,
}: {
  currentPage: number;
  pageEnd: number;
  pageStart: number;
  scope: AdminSiteScope;
  stockPageHref: (page: number) => string;
  stockQuery: StockListQuery;
  totalItems: number;
  totalPages: number;
}) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
      <span>
        แสดง {formatQuantity(pageStart)} ถึง {formatQuantity(pageEnd)} จาก{" "}
        {formatQuantity(totalItems)} รายการ · หน้า {currentPage}/{totalPages}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {totalPages > 1 ? (
          <nav aria-label="Stock pagination" className="flex items-center gap-1">
            <Link
              aria-disabled={currentPage === 1}
              className={paginationArrowClass(currentPage === 1)}
              href={stockPageHref(Math.max(1, currentPage - 1))}
            >
              <ChevronLeft size={16} />
            </Link>
            {paginationWindow(currentPage, totalPages).map((pageNumber) => (
              <Link
                aria-current={pageNumber === currentPage ? "page" : undefined}
                className={paginationPageClass(pageNumber === currentPage)}
                href={stockPageHref(pageNumber)}
                key={pageNumber}
              >
                {pageNumber}
              </Link>
            ))}
            <Link
              aria-disabled={currentPage === totalPages}
              className={paginationArrowClass(currentPage === totalPages)}
              href={stockPageHref(Math.min(totalPages, currentPage + 1))}
            >
              <ChevronRight size={16} />
            </Link>
          </nav>
        ) : null}
        {totalPages > 1 ? (
          <form
            action="/dashboardstore/stock#stock-table-region"
            aria-label="ไปยังหน้าที่ต้องการ"
            className="flex items-center gap-1"
            method="get"
          >
            <StockListStateFields
              query={stockQuery}
              scope={{
                organizationId: scope.organization.id,
                plantId: scope.plant.id,
              }}
            />
            <label className="inline-flex items-center gap-1 font-bold">
              ไปหน้า
              <input
                aria-label="เลขหน้า"
                className="h-9 w-16 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 text-center font-bold text-[var(--ink)] outline-none focus:border-[var(--primary)]"
                defaultValue={currentPage}
                max={totalPages}
                min="1"
                name="page"
                required
                type="number"
              />
            </label>
            <button
              className="h-9 rounded-xl bg-[var(--primary)] px-3 font-bold text-white transition hover:bg-[var(--primary-strong)]"
              type="submit"
            >
              ไป
            </button>
          </form>
        ) : null}
        <span className="rounded-full bg-[var(--soft)] px-3 py-1 font-bold">
          Site: {scope.plant.name}
        </span>
      </div>
    </footer>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(
    value,
  );
}

function paginationPageClass(isActive: boolean) {
  return [
    "inline-flex size-9 items-center justify-center rounded-xl text-sm font-extrabold transition",
    isActive
      ? "bg-[var(--primary)] text-white shadow-sm"
      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:-translate-y-0.5 hover:bg-[var(--soft)]",
  ].join(" ");
}

function paginationArrowClass(isDisabled: boolean) {
  return [
    "inline-flex size-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--soft)]",
    isDisabled ? "pointer-events-none opacity-45" : "",
  ].join(" ");
}
