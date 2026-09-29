import type { SparePartsPageData } from "./spare-parts-page-data";

export type SparePartsListQuery = {
  partsPage?: string;
  search?: string;
  storeId?: string;
  typeId?: string;
  categoryId?: string;
  materialGroupId?: string;
  unit?: string;
  editPartId?: string;
};

const SPARE_PARTS_PAGE_SIZE = 50;

export function buildSparePartsPageModel(
  data: SparePartsPageData,
  query: SparePartsListQuery,
) {
  const editPart = query.editPartId
    ? data.spareParts.find((part) => part.id === query.editPartId)
    : null;
  const activeStores = data.stores.filter((store) => store.active);
  const activePartCategories = data.partCategories.filter(
    (category) => category.active,
  );
  const activeMaterialGroups = data.materialGroups.filter(
    (group) => group.active,
  );
  const activePartTypes = data.partTypes.filter((type) => type.active);
  const search = query.search?.trim().toLocaleLowerCase("th") ?? "";
  const units = [
    ...new Set(data.spareParts.map((part) => part.unit).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right, "th"));
  const filteredSpareParts = data.spareParts.filter((part) => {
    if (query.storeId && part.defaultStoreId !== query.storeId) return false;
    if (query.typeId && part.typeId !== query.typeId) return false;
    if (query.categoryId && part.categoryId !== query.categoryId) return false;
    if (
      query.materialGroupId &&
      part.materialGroupId !== query.materialGroupId
    ) {
      return false;
    }
    if (query.unit && part.unit !== query.unit) return false;
    if (!search) return true;
    return [part.code, part.itemCode, part.name, part.description]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("th").includes(search));
  });
  const applicableZoneByZoneId = new Map(
    data.storeApplicableZones.map((assignment) => [
      assignment.zoneId,
      assignment,
    ]),
  );
  const totalSparePartsPages = Math.max(
    1,
    Math.ceil(filteredSpareParts.length / SPARE_PARTS_PAGE_SIZE),
  );
  const requestedSparePartsPage = Number.parseInt(query.partsPage ?? "1", 10);
  const currentSparePartsPage =
    Number.isFinite(requestedSparePartsPage) && requestedSparePartsPage > 0
      ? Math.min(requestedSparePartsPage, totalSparePartsPages)
      : 1;
  const firstVisibleSparePartIndex =
    (currentSparePartsPage - 1) * SPARE_PARTS_PAGE_SIZE;
  const visibleSpareParts = filteredSpareParts.slice(
    firstVisibleSparePartIndex,
    firstVisibleSparePartIndex + SPARE_PARTS_PAGE_SIZE,
  );
  const uncategorizedPartCount = data.spareParts.filter(
    (part) => !part.categoryId,
  ).length;
  const categoryRows = [
    ...data.partCategories.map((category) => ({
      id: category.id,
      name: category.name,
      count: data.spareParts.filter((part) => part.categoryId === category.id)
        .length,
    })),
    ...(uncategorizedPartCount
      ? [
          {
            id: "uncategorized",
            name: "ไม่ระบุหมวด",
            count: uncategorizedPartCount,
          },
        ]
      : []),
  ];
  const totalPartValue = data.spareParts.reduce(
    (sum, part) =>
      sum +
      part.stocks.reduce(
        (stockSum, stock) =>
          stockSum + Number(stock.quantity) * Number(part.latestUnitPrice ?? 0),
        0,
      ),
    0,
  );
  const activePartCount = data.spareParts.filter((part) => part.active).length;
  const lowStockPartCount = data.spareParts.filter((part) => {
    const totalStock = part.stocks.reduce(
      (sum, stock) => sum + Number(stock.quantity),
      0,
    );
    return totalStock <= Number(part.minStock);
  }).length;
  const activeFilterCount = [
    query.search,
    query.storeId,
    query.typeId,
    query.categoryId,
    query.materialGroupId,
    query.unit,
  ].filter(Boolean).length;

  return {
    activeFilterCount,
    activeMaterialGroups,
    activePartCategories,
    activePartCount,
    activePartTypes,
    activeStores,
    applicableZoneByZoneId,
    categoryRows,
    currentSparePartsPage,
    editPart,
    filteredSpareParts,
    firstVisibleSparePartIndex,
    lowStockPartCount,
    search,
    totalPartValue,
    totalSparePartsPages,
    units,
    visibleSpareParts,
  };
}

export type SparePartsPageModel = ReturnType<typeof buildSparePartsPageModel>;
