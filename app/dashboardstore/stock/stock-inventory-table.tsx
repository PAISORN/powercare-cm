import { StockHeaderReplacementController } from "../../../components/stock-header-replacement-controller";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockListQuery } from "../../../modules/store/stock-list-query";
import type { StockBalanceRow } from "../../../modules/store/stock-read-service";
import { StockPagination } from "./stock-pagination";
import { StockTableRows } from "./stock-table-rows";

export function StockInventoryTable({
  canAdjust,
  canIssue,
  canManageParts,
  canReceive,
  canViewValue,
  currentPage,
  pageEnd,
  pageStart,
  pagedStocks,
  scope,
  sparePartEditHref,
  stockListPositionKey,
  stockPageHref,
  stockQuery,
  stockRowNumbers,
  totalItems,
  totalPages,
}: {
  canAdjust: boolean;
  canIssue: boolean;
  canManageParts: boolean;
  canReceive: boolean;
  canViewValue: boolean;
  currentPage: number;
  pageEnd: number;
  pageStart: number;
  pagedStocks: StockBalanceRow[];
  scope: AdminSiteScope;
  sparePartEditHref: (sparePartId: string) => string;
  stockListPositionKey: string;
  stockPageHref: (page: number) => string;
  stockQuery: StockListQuery;
  stockRowNumbers: Map<string, number>;
  totalItems: number;
  totalPages: number;
}) {
  return (
    <>
      <StockHeaderReplacementController regionId="stock-table-region" />
      <section
        className="ops-panel stock-table-panel rounded-3xl border border-[var(--line)]"
        id="stock-table-region"
      >
        <div
          aria-hidden="true"
          className="stock-replacement-header"
          data-stock-replacement-header
        >
          <table className="w-full min-w-[1340px] table-fixed border-separate border-spacing-0 text-left text-sm">
            <StockTableColGroup />
            <StockTableHead />
          </table>
        </div>
        <div
          className="relative overflow-x-auto rounded-t-3xl bg-[var(--surface)]"
          data-stock-table-scroll
        >
          <table className="w-full min-w-[1340px] table-fixed border-separate border-spacing-0 text-left text-sm">
            <StockTableColGroup />
            <StockTableHead sticky />
            <tbody>
              <StockTableRows
                navigation={{
                  currentPage,
                  sparePartEditHref,
                  stockListPositionKey,
                  stockPageHref,
                }}
                pagedStocks={pagedStocks}
                permissions={{
                  canAdjust,
                  canIssue,
                  canManageParts,
                  canReceive,
                  canViewValue,
                }}
                scope={scope}
                stockRowNumbers={stockRowNumbers}
              />
            </tbody>
          </table>
          {!totalItems ? (
            <div className="p-10 text-center text-sm text-[var(--muted)]">
              ไม่พบรายการสต็อกตามตัวกรองที่เลือก
            </div>
          ) : null}
        </div>
        <StockPagination
          currentPage={currentPage}
          pageEnd={pageEnd}
          pageStart={pageStart}
          scope={scope}
          stockPageHref={stockPageHref}
          stockQuery={stockQuery}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </section>
    </>
  );
}

function StockTableHead({ sticky = false }: { sticky?: boolean }) {
  return (
    <thead
      className={
        sticky
          ? "sticky top-0 z-40 bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)] shadow-[0_1px_0_var(--line)]"
          : "bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)]"
      }
      {...(sticky ? { "data-stock-table-header": true } : {})}
    >
      <tr>
        <th className="w-20 px-4 py-4 text-center">ลำดับ</th>
        <th className="px-4 py-4">ชื่อและรหัสอะไหล่</th>
        <th className="px-4 py-4">Item code</th>
        <th className="px-4 py-4">หมวดหมู่</th>
        <th className="px-4 py-4">ประเภท</th>
        <th className="py-4 pl-4 pr-1">คลังอะไหล่ / ตำแหน่ง</th>
        <th className="py-4 pl-1 pr-3 text-right">คงเหลือ</th>
        <th className="px-4 py-4 text-right">Max / Min</th>
        <th className="px-4 py-4">สถานะสต็อก</th>
        <th className="px-4 py-4 text-left">มูลค่าอะไหล่</th>
        <th className="w-[120px] px-2 py-4 text-right" />
      </tr>
    </thead>
  );
}

function StockTableColGroup() {
  return (
    <colgroup>
      <col style={{ width: "60px" }} />
      <col style={{ width: "270px" }} />
      <col style={{ width: "100px" }} />
      <col style={{ width: "150px" }} />
      <col style={{ width: "110px" }} />
      <col style={{ width: "105px" }} />
      <col style={{ width: "65px" }} />
      <col style={{ width: "75px" }} />
      <col style={{ width: "120px" }} />
      <col style={{ width: "110px" }} />
      <col style={{ width: "120px" }} />
    </colgroup>
  );
}
