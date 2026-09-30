import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { StockPageData } from "../../../modules/store/stock-page-data";
import type { StockBalanceRow } from "../../../modules/store/stock-read-service";
import { StockActionDrawer } from "./stock-action-drawer";
import { StockEditDrawer } from "./stock-edit-drawer";
import { StockExcelImportDrawer } from "./stock-excel-import-drawer";
import type { StockPageQuery } from "./types";

export function StockDrawers({
  canEditValue,
  canManageParts,
  categories,
  currentPage,
  editPart,
  issueZones,
  materialGroups,
  query,
  scope,
  selectedStock,
  sparePartTypes,
  stockAction,
  stockPageHref,
  stores,
  user,
}: {
  canEditValue: boolean;
  canManageParts: boolean;
  categories: StockPageData["categories"];
  currentPage: number;
  editPart: StockBalanceRow["sparePart"] | null;
  issueZones: StockPageData["issueZones"];
  materialGroups: StockPageData["materialGroups"];
  query: StockPageQuery;
  scope: AdminSiteScope;
  selectedStock: StockBalanceRow | null | undefined;
  sparePartTypes: StockPageData["sparePartTypes"];
  stockAction: "issue" | "receive" | "adjust" | undefined;
  stockPageHref: (page: number) => string;
  stores: StockPageData["stores"];
  user: { role: string };
}) {
  return (
    <div className="contents">
      {editPart && canManageParts ? (
        <StockEditDrawer
          canEditValue={canEditValue}
          categories={categories}
          currentPage={currentPage}
          editPart={editPart}
          materialGroups={materialGroups}
          scope={scope}
          sparePartTypes={sparePartTypes}
          stockPageHref={stockPageHref}
          stores={stores}
          user={user}
        />
      ) : null}
      {selectedStock && stockAction ? (
        <StockActionDrawer
          currentPage={currentPage}
          issueZones={issueZones}
          scope={scope}
          selectedStock={selectedStock}
          stockAction={stockAction}
          stockPageHref={stockPageHref}
        />
      ) : null}
      {query.importExcel === "1" && canManageParts ? (
        <StockExcelImportDrawer
          categories={categories}
          currentPage={currentPage}
          query={query}
          scope={scope}
          sparePartTypes={sparePartTypes}
          stockPageHref={stockPageHref}
          stores={stores}
        />
      ) : null}
    </div>
  );
}
