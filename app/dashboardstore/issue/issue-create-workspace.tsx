import { IssueRequestForm } from "../../../components/store/issue-request-form";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import {
  INVENTORY_ITEM_KINDS,
  type InventoryItemKind,
} from "../../../modules/store/inventory-user-scope";
import type { IssuePageData } from "../../../modules/store/issue-page-data";
import { createIssueAction } from "./actions";

type IssueCreateWorkspaceProps = Pick<
  IssuePageData,
  "cmWorks" | "issueZones" | "stocks"
> & {
  defaultItemKind: InventoryItemKind;
  requestedItemKind?: string;
  requester: {
    name: string;
    department?: string | null;
  };
  scope: Pick<AdminSiteScope, "organization" | "plant">;
};

export function IssueCreateWorkspace({
  cmWorks,
  defaultItemKind,
  issueZones,
  requestedItemKind,
  requester,
  scope,
  stocks,
}: IssueCreateWorkspaceProps) {
  return (
    <section className="mt-6" data-testid="issue-create-workspace">
      {!issueZones.length ? (
        <div className="mb-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-200">
          Site นี้ยังไม่มี Applicable Zone ที่เปิดใช้งาน จึงยังสร้างใบเบิกไม่ได้
          กรุณากำหนดรหัส Zone ในหน้า Spare Parts ก่อน
        </div>
      ) : null}

      <IssueRequestForm
        action={createIssueAction}
        cmWorks={cmWorks.map((work) => ({
          id: work.id,
          number: work.number,
          label: `${work.machineName} · ${work.problemTitle}`,
        }))}
        hideHeader
        initialItemKind={resolveItemKind(requestedItemKind, defaultItemKind)}
        issueZones={issueZones.map((item) => ({
          ...item.zone,
          code: item.code,
        }))}
        organizationId={scope.organization.id}
        plantId={scope.plant.id}
        requesterSummary={requester}
        siteSummary={{
          organizationName: scope.organization.name,
          plantName: scope.plant.name,
          inventoryCode: scope.plant.code,
        }}
        stocks={stocks.map((stock) => ({
          storeId: stock.storeId,
          sparePartId: stock.sparePartId,
          sparePartItemKind: stock.sparePart.itemKind,
          label: `${stock.store.code} · ${stock.sparePart.code} · ${stock.sparePart.name}`,
          available: Number(stock.quantity),
          unit: stock.sparePart.unit,
          storeCode: stock.store.code,
          storeName: stock.store.name,
          storeCategoryName: stock.store.category?.name,
          sparePartCode: stock.sparePart.code,
          sparePartName: stock.sparePart.name,
          sparePartTypeName: stock.sparePart.type?.name,
          sparePartCategoryName: stock.sparePart.category?.name,
          sparePartMaterialGroupName: stock.sparePart.materialGroup?.name,
          itemCode: stock.sparePart.itemCode,
          stockStatus: buildStoreStockStatus(
            Number(stock.quantity),
            Number(stock.sparePart.minStock),
          ),
        }))}
      />
    </section>
  );
}

function resolveItemKind(
  value: string | undefined,
  fallback: InventoryItemKind,
): InventoryItemKind {
  return INVENTORY_ITEM_KINDS.includes(value as InventoryItemKind)
    ? (value as InventoryItemKind)
    : fallback;
}

function buildStoreStockStatus(quantity: number, minStock: number) {
  if (quantity <= 0) return "OUT";
  if (quantity <= minStock) return "LOW";
  return "ENOUGH";
}
