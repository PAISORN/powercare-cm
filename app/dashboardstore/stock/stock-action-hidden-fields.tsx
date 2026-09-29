import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockBalanceRow } from "../../../modules/store/stock-read-service";

export function StockActionHiddenFields({
  currentPage,
  scope,
  selectedStock,
  stockPageHref,
}: {
  currentPage: number;
  scope: AdminSiteScope;
  selectedStock: StockBalanceRow;
  stockPageHref: (page: number) => string;
}) {
  return (
    <>
      <AdminScopeHiddenFields scope={scope} />
      <input
        name="returnTo"
        type="hidden"
        value={`${stockPageHref(currentPage)}#stock-row-${selectedStock.sparePart.id}`}
      />
      <input
        name="stockKey"
        type="hidden"
        value={`${selectedStock.storeId}:${selectedStock.sparePartId}`}
      />
    </>
  );
}
