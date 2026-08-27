import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  MoreVertical,
  PackagePlus,
  Printer,
  Search,
  SlidersHorizontal,
  Warehouse,
  X,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AdminScopeHiddenFields,
  AdminSiteScopeSelector,
} from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { AutoSubmitSelect } from "../../../components/auto-submit-select";
import { ConfirmSubmitButton } from "../../../components/confirm-submit-button";
import { ExclusiveDetails } from "../../../components/exclusive-details";
import { PreserveListPositionLink, RestoreListPosition } from "../../../components/preserve-list-position";
import { StockHeaderReplacementController } from "../../../components/stock-header-replacement-controller";
import { SparePartClassificationFields } from "../../../components/store/spare-part-classification-fields";
import { db } from "../../../lib/db";
import { paginationWindow } from "../../../lib/pagination-window";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import {
  canUseUserPermission,
  PermissionKey,
} from "../../../modules/auth/site-admin-permissions";
import { adjustStock } from "../../../modules/store/store-adjustment-prisma";
import { createLoggedInStoreIssue } from "../../../modules/store/store-issue-prisma";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import { deleteSparePart, updateSparePart } from "../../../modules/store/store-prisma-service";
import { receiveStock } from "../../../modules/store/store-receive-prisma";
import { importSparePartsFromExcel } from "../../../modules/store/store-excel-import-prisma";
import { sparePartImportErrorMessage } from "../../../modules/store/spare-part-excel-import";

type PageQuery = {
  organizationId?: string;
  plantId?: string;
  search?: string;
  storeId?: string;
  typeId?: string;
  categoryId?: string;
  materialGroupId?: string;
  itemKind?: "SPARE_PART" | "CHEMICAL" | "OIL";
  unit?: string;
  stockStatus?: "all" | "available" | "nearMin" | "outOfStock";
  stockAction?: "issue" | "receive" | "adjust";
  stockId?: string;
  page?: string;
  saved?: string;
  error?: string;
  importExcel?: string;
  imported?: string;
  importError?: string;
  editPartId?: string;
};

async function updateSparePartFromStockAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  if (!plant.inventoryCode) throw new Error("Store Site code must be configured before editing spare parts.");
  const optionalNumber = (value: FormDataEntryValue | null) => {
    const text = String(value ?? "").trim();
    return text ? Number(text) : null;
  };
  const sparePartId = String(formData.get("sparePartId") ?? "");
  const requestedReturnTo = String(formData.get("returnTo") ?? "");
  const existingPrice = canUseUserPermission(user, PermissionKey.VIEW_STOCK_VALUE)
    ? optionalNumber(formData.get("latestUnitPrice"))
    : (await db.sparePart.findFirstOrThrow({
        where: { id: sparePartId, plantId: scope.plant.id },
        select: { latestUnitPrice: true },
      })).latestUnitPrice;
  await updateSparePart(
    user,
    {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      plantCode: plant.inventoryCode,
    },
    sparePartId,
    {
      itemKind: String(formData.get("itemKind") ?? "SPARE_PART"),
      name: String(formData.get("name") ?? ""),
      itemCode: String(formData.get("itemCode") ?? ""),
      description: String(formData.get("description") ?? ""),
      unit: String(formData.get("unit") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      materialGroupId: String(formData.get("materialGroupId") ?? ""),
      typeId: String(formData.get("typeId") ?? ""),
      defaultStoreId: String(formData.get("defaultStoreId") ?? ""),
      minStock: Number(formData.get("minStock") ?? 0),
      maxStock: optionalNumber(formData.get("maxStock")),
      reorderPoint: Number(formData.get("reorderPoint") ?? 0),
      latestUnitPrice: existingPrice == null ? null : Number(existingPrice),
      active: formData.get("active") === "on",
    },
  );
  const scopedPrefix = `/dashboardstore/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`;
  const safeReturnTo = requestedReturnTo.startsWith(scopedPrefix) ? requestedReturnTo : scopedPrefix;
  const [returnPath, returnHash] = safeReturnTo.split("#", 2);
  redirect(`${returnPath}${returnPath.includes("?") ? "&" : "?"}saved=spare-part-updated${returnHash ? `#${returnHash}` : ""}`);
}

async function importSparePartsExcelAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  const baseUrl = `/dashboardstore/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`;

  if (!plant.inventoryCode) {
    redirect(`${baseUrl}&importExcel=1&importError=${encodeURIComponent("กรุณากำหนดรหัส Site สำหรับคลังอะไหล่ก่อนนำเข้า Excel")}`);
  }

  let importedCount = 0;
  let importError: string | null = null;
  try {
    const upload = formData.get("excelFile");
    if (!(upload instanceof File) || upload.size === 0) {
      throw new Error("กรุณาเลือกไฟล์ Excel ที่ต้องการนำเข้า");
    }
    const result = await importSparePartsFromExcel(
      user,
      {
        organizationId: scope.organization.id,
        plantId: scope.plant.id,
        plantCode: plant.inventoryCode,
      },
      upload,
    );
    importedCount = result.importedCount;
  } catch (error) {
    importError = sparePartImportErrorMessage(error);
  }

  redirect(
    importError
      ? `${baseUrl}&importExcel=1&importError=${encodeURIComponent(importError)}`
      : `${baseUrl}&imported=${importedCount}`,
  );
}

async function adjustStockAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const [storeId, sparePartId] = String(formData.get("stockKey") ?? "").split(":");
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  if (!plant.inventoryCode) throw new Error("Store Site code must be configured before adjusting stock.");

  let adjustmentError: string | null = null;
  try {
    await adjustStock(
      user,
      {
        organizationId: scope.organization.id,
        plantId: scope.plant.id,
        plantCode: plant.inventoryCode,
      },
      {
        storeId: storeId ?? "",
        sparePartId: sparePartId ?? "",
        quantityChange: Number(formData.get("quantityChange")),
        reason: String(formData.get("reason") ?? ""),
        occurredAt: new Date(),
      },
    );
  } catch (error) {
    adjustmentError = adjustmentErrorMessage(error);
  }

  redirect(
    `/dashboardstore/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}${
      adjustmentError ? `&error=${encodeURIComponent(adjustmentError)}` : "&saved=1"
    }`,
  );
}

async function receiveOneStockAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const [storeId, sparePartId] = String(formData.get("stockKey") ?? "").split(":");
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  if (!plant.inventoryCode) throw new Error("Store Site code must be configured before receiving stock.");

  await receiveStock(
    user,
    {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      plantCode: plant.inventoryCode,
    },
    {
      supplierName: optionalText(formData.get("supplierName")),
      referenceNo: optionalText(formData.get("referenceNo")),
      note: optionalText(formData.get("note")),
      receivedAt: new Date(),
      items: [
        {
          storeId: storeId ?? "",
          sparePartId: sparePartId ?? "",
          quantity: Number(formData.get("quantity")),
          unitPrice: optionalNumber(formData.get("unitPrice")),
        },
      ],
    },
  );

  redirect(stockRedirect(scope, "received"));
}

async function createOneIssueAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const [storeId, sparePartId] = String(formData.get("stockKey") ?? "").split(":");
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });

  await createLoggedInStoreIssue(
    user,
    {
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      plantCode: plant.inventoryCode ?? "",
    },
    {
      issueType: "DIRECT",
      requesterName: user.fullName,
      note: optionalText(formData.get("note")),
      requestedAt: new Date(),
      submissionKey: optionalText(formData.get("submissionKey")),
      items: [
        {
          storeId: storeId ?? "",
          sparePartId: sparePartId ?? "",
          zoneId: String(formData.get("zoneId") ?? ""),
          requestedQty: Number(formData.get("quantity")),
        },
      ],
    },
  );

  redirect(stockRedirect(scope, "issue-created"));
}

async function deleteSparePartFromStockAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  await deleteSparePart(user, {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    plantCode: plant.inventoryCode ?? "",
  }, String(formData.get("sparePartId") ?? ""));

  redirect(stockRedirect(scope, "spare-part-deleted"));
}

export default async function StockPage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  if (
    !canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK) &&
    !canUseUserPermission(user, PermissionKey.ADJUST_STOCK)
  ) redirect("/dashboardcm");

  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const canAdjust = canUseUserPermission(user, PermissionKey.ADJUST_STOCK);
  const canManageParts = canUseUserPermission(user, PermissionKey.MANAGE_SPARE_PARTS);
  const canReceive = canUseUserPermission(user, PermissionKey.RECEIVE_STOCK);
  const canIssue = canUseUserPermission(user, PermissionKey.CREATE_STORE_ISSUE);
  const canViewValue = canUseUserPermission(user, PermissionKey.VIEW_STOCK_VALUE);
  const search = query.search?.trim() ?? "";
  const stockStatus = query.stockStatus ?? "all";

  const [stores, categories, materialGroups, sparePartTypes, issueZones, units, stocks, searchSuggestions] = await Promise.all([
    db.store.findMany({
      where: { plantId: scope.plant.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, location: true },
    }),
    db.sparePartCategory.findMany({
      where: { plantId: scope.plant.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    db.sparePartMaterialGroup.findMany({
      where: { plantId: scope.plant.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, categoryId: true, name: true, code: true },
    }),
    db.sparePartType.findMany({
      where: { plantId: scope.plant.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    db.storeApplicableZone.findMany({
      where: { plantId: scope.plant.id, active: true, zone: { active: true } },
      orderBy: { code: "asc" },
      select: { code: true, zone: { select: { id: true, name: true } } },
    }),
    db.sparePart.findMany({
      where: { plantId: scope.plant.id, active: true },
      orderBy: { unit: "asc" },
      select: { unit: true },
      distinct: ["unit"],
    }),
    db.storeStock.findMany({
      where: {
        plantId: scope.plant.id,
        ...(query.storeId ? { storeId: query.storeId } : {}),
        store: { plantId: scope.plant.id, active: true },
        sparePart: {
          plantId: scope.plant.id,
          active: true,
          ...(query.itemKind ? { itemKind: query.itemKind } : {}),
          ...(query.typeId ? { typeId: query.typeId } : {}),
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          ...(query.materialGroupId ? { materialGroupId: query.materialGroupId } : {}),
          ...(query.unit ? { unit: query.unit } : {}),
          ...(search
            ? {
                OR: [
                  { code: { contains: search } },
                  { itemCode: { contains: search } },
                  { name: { contains: search } },
                ],
              }
            : {}),
        },
      },
      include: {
        store: { select: { id: true, name: true, code: true, location: true, category: { select: { name: true } } } },
        sparePart: {
          select: {
            id: true,
            code: true,
            itemCode: true,
            itemKind: true,
            name: true,
            description: true,
            unit: true,
            minStock: true,
            maxStock: true,
            latestUnitPrice: true,
            reorderPoint: true,
            categoryId: true,
            materialGroupId: true,
            typeId: true,
            defaultStoreId: true,
            active: true,
            category: { select: { name: true } },
            materialGroup: { select: { name: true } },
            type: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: [{ store: { name: "asc" } }, { sparePart: { name: "asc" } }],
    }),
    db.sparePart.findMany({
      where: { plantId: scope.plant.id, active: true },
      select: { id: true, code: true, itemCode: true, name: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  const visibleStocks = stocks.filter((stock) => {
    const quantity = Number(stock.quantity);
    const minStock = Number(stock.sparePart.minStock);
    if (stockStatus === "available") return quantity > minStock;
    if (stockStatus === "nearMin") return quantity > 0 && quantity <= minStock;
    if (stockStatus === "outOfStock") return quantity <= 0;
    return true;
  });
  const totalQuantity = visibleStocks.reduce((sum, stock) => sum + Number(stock.quantity), 0);
  const totalValue = visibleStocks.reduce(
    (sum, stock) => sum + Number(stock.quantity) * Number(stock.sparePart.latestUnitPrice ?? 0),
    0,
  );
  const nearMinCount = visibleStocks.filter((stock) => {
    const quantity = Number(stock.quantity);
    return quantity > 0 && quantity <= Number(stock.sparePart.minStock);
  }).length;
  const outOfStockCount = visibleStocks.filter((stock) => Number(stock.quantity) <= 0).length;
  const groupedVisibleStocks = [...visibleStocks].sort((left, right) => {
    const leftCategory = left.sparePart.category?.name ?? "";
    const rightCategory = right.sparePart.category?.name ?? "";
    if (leftCategory !== rightCategory) return leftCategory.localeCompare(rightCategory, "th");
    return left.sparePart.name.localeCompare(right.sparePart.name, "th");
  });
  const stockPageSize = 50;
  const totalPages = Math.max(1, Math.ceil(groupedVisibleStocks.length / stockPageSize));
  const requestedPage = Number.parseInt(query.page ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  const pageStart = groupedVisibleStocks.length ? (currentPage - 1) * stockPageSize + 1 : 0;
  const pageEnd = Math.min(currentPage * stockPageSize, groupedVisibleStocks.length);
  const pagedStocks = groupedVisibleStocks.slice(pageStart ? pageStart - 1 : 0, pageEnd);
  const categoryRunningNumbers = new Map<string, number>();
  const stockRowNumbers = new Map<string, number>();
  groupedVisibleStocks.forEach((stock) => {
    const categoryName = stock.sparePart.category?.name ?? "ไม่ระบุหมวดหมู่";
    const categoryRunning = (categoryRunningNumbers.get(categoryName) ?? 0) + 1;
    categoryRunningNumbers.set(categoryName, categoryRunning);
    stockRowNumbers.set(stock.id, categoryRunning);
  });
  const scopedHref = `/dashboardstore/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`;
  const stockPageHref = (page: number) => {
    const params = new URLSearchParams({
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
    });
    if (search) params.set("search", search);
    if (query.storeId) params.set("storeId", query.storeId);
    if (query.typeId) params.set("typeId", query.typeId);
    if (query.categoryId) params.set("categoryId", query.categoryId);
    if (query.materialGroupId) params.set("materialGroupId", query.materialGroupId);
    if (query.itemKind) params.set("itemKind", query.itemKind);
    if (query.unit) params.set("unit", query.unit);
    if (stockStatus !== "all") params.set("stockStatus", stockStatus);
    if (page > 1) params.set("page", String(page));
    return `/dashboardstore/stock?${params.toString()}`;
  };
  const sparePartEditHref = (sparePartId: string) =>
    `${stockPageHref(currentPage)}&editPartId=${encodeURIComponent(sparePartId)}#edit-spare-part`;
  const editPart = query.editPartId
    ? stocks.find((stock) => stock.sparePart.id === query.editPartId)?.sparePart ?? null
    : null;
  const selectedStock = query.stockId ? stocks.find((stock) => stock.id === query.stockId) : null;
  const requestedStockAction = selectedStock ? query.stockAction : undefined;
  const stockAction = requestedStockAction === "adjust" && !canAdjust ? undefined : requestedStockAction;
  const stockListPositionKey = `stock:${stockPageHref(currentPage)}`;

  return (
    <AppShell>
      <div className="space-y-5">
        <RestoreListPosition enabled={!editPart && !stockAction} storageKey={stockListPositionKey} />
        <header className="menu-heading-plain stock-page-hero relative overflow-hidden rounded-3xl border p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/70">Home &gt; Inventory &gt; Stock</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Stock (คลังอะไหล่)</h1>
            <p className="mt-1 max-w-3xl text-sm text-white/75">
              ตรวจสอบยอดคงเหลือ มูลค่าคลัง จุดขั้นต่ำ และประวัติการเคลื่อนไหวของอะไหล่ใน Site
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]"
              href="/dashboardstore/receive"
            >
              <PackagePlus size={17} />
              เพิ่มอะไหล่เข้าสต็อก
            </Link>
            {canManageParts ? (
              <Link className={`${secondaryButtonClass} stock-hero-secondary`} href={`${scopedHref}&importExcel=1#excel-import-drawer`}>
                <Download size={17} />
                นำเข้า Excel
              </Link>
            ) : null}
            <Link className={`${secondaryButtonClass} stock-hero-secondary`} href="/dashboardstore/reports">
              <Printer size={17} />
              พิมพ์รายงาน
            </Link>
          </div>
          </div>
        </header>

        <AdminSiteScopeSelector
          action="/dashboardstore/stock"
          description="เลือก Organization และ Site ที่ต้องการดูข้อมูลคลังอะไหล่"
          scope={scope}
          title="Stock site scope"
        />

        {query.saved === "1" ? (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            ปรับยอดสต็อกและบันทึกประวัติเรียบร้อยแล้ว
          </p>
        ) : null}
        {query.error ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-700 dark:text-red-300" role="alert">
            ปรับยอดไม่สำเร็จ: {query.error}
          </p>
        ) : null}
        {query.imported ? (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300" role="status">
            นำเข้าอะไหล่จาก Excel สำเร็จ {query.imported} รายการ พร้อมสร้างยอดตั้งต้นแล้ว
          </p>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {canViewValue ? (
            <SummaryCard
              color="blue"
              icon={<Boxes size={28} />}
              label="มูลค่าอะไหล่คงเหลือรวม"
              sublabel="บาท"
              value={formatMoney(totalValue)}
            />
          ) : null}
          <SummaryCard
            color="green"
            icon={<Warehouse size={28} />}
            label="จำนวนรายการอะไหล่"
            sublabel="รายการ"
            value={formatQuantity(visibleStocks.length)}
          />
          <SummaryCard
            color="violet"
            icon={<SlidersHorizontal size={28} />}
            label="จำนวนทั้งหมด"
            sublabel="หน่วยนับ"
            value={formatQuantity(totalQuantity)}
          />
          <SummaryCard
            color="orange"
            icon={<AlertTriangle size={28} />}
            label="ใกล้หมด (ต่ำกว่า Min)"
            sublabel="รายการ"
            value={formatQuantity(nearMinCount)}
          />
          <SummaryCard
            color="red"
            icon={<AlertTriangle size={28} />}
            label="หมดสต็อก"
            sublabel="รายการ"
            value={formatQuantity(outOfStockCount)}
          />
        </section>

        <section className="ops-panel rounded-3xl border border-[var(--line)] p-4">
          <form action="/dashboardstore/stock" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.45fr_repeat(6,minmax(120px,0.7fr))_auto_auto] xl:items-end">
            <AdminScopeHiddenFields scope={scope} />
            <label className={labelClass}>
              ค้นหา
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
                <input autoComplete="off" className={`${inputClass} pl-10`} defaultValue={search} list="stock-search-suggestions" name="search" placeholder="ค้นหา รหัสอะไหล่, รายการอะไหล่, Part No." />
                <datalist id="stock-search-suggestions">
                  {searchSuggestions.map((item) => (
                    <option key={item.id} value={item.code}>{item.itemCode ? `${item.itemCode} · ` : ""}{item.name}</option>
                  ))}
                </datalist>
              </span>
            </label>
            <label className={labelClass}>
              คลังอะไหล่
              <AutoSubmitSelect className={inputClass} defaultValue={query.storeId ?? ""} name="storeId">
                <option value="">ทั้งหมด</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
            <label className={labelClass}>
              ชนิดรายการ
              <AutoSubmitSelect className={inputClass} defaultValue={query.itemKind ?? ""} name="itemKind">
                <option value="">ทั้งหมด</option>
                <option value="SPARE_PART">อะไหล่</option>
                <option value="CHEMICAL">สารเคมี</option>
                <option value="OIL">น้ำมัน</option>
              </AutoSubmitSelect>
            </label>
            <label className={labelClass}>
              ประเภท
              <AutoSubmitSelect className={inputClass} defaultValue={query.typeId ?? ""} name="typeId">
                <option value="">ทั้งหมด</option>
                {sparePartTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
            <SparePartClassificationFields
              categories={categories}
              className={inputClass}
              defaultCategoryId={query.categoryId ?? ""}
              defaultMaterialGroupId={query.materialGroupId ?? ""}
              filter
              groups={materialGroups}
            />
            <label className={labelClass}>
              หน่วยนับ
              <AutoSubmitSelect className={inputClass} defaultValue={query.unit ?? ""} name="unit">
                <option value="">ทั้งหมด</option>
                {units.map((item) => (
                  <option key={item.unit} value={item.unit}>
                    {item.unit}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
            <label className={labelClass}>
              สถานะสต็อก
              <AutoSubmitSelect className={inputClass} defaultValue={stockStatus} name="stockStatus">
                <option value="all">ทั้งหมด</option>
                <option value="available">เพียงพอ</option>
                <option value="nearMin">ใกล้หมด</option>
                <option value="outOfStock">หมดสต็อก</option>
              </AutoSubmitSelect>
            </label>
            <button className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white transition hover:bg-[var(--primary-strong)]">
              ค้นหา
            </button>
            <Link className={clearButtonClass} href={scopedHref}>
              ล้างค่า
            </Link>
          </form>
        </section>

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
              <thead className="bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)]">
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
            </table>
          </div>
          <div className="relative overflow-x-auto rounded-t-3xl bg-[var(--surface)]" data-stock-table-scroll>
            <table className="w-full min-w-[1340px] table-fixed border-separate border-spacing-0 text-left text-sm">
              <StockTableColGroup />
              <thead
                className="sticky top-0 z-40 bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)] shadow-[0_1px_0_var(--line)]"
                data-stock-table-header
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
              <tbody>
                {pagedStocks.map((stock) => {
                  const quantity = Number(stock.quantity);
                  const unitPrice = Number(stock.sparePart.latestUnitPrice ?? 0);
                  return (
                    <tr
                      key={stock.id}
                      id={`stock-row-${stock.sparePart.id}`}
                      className="bg-[var(--surface)] transition hover:bg-[var(--soft)]/80 [&>td]:border-b [&>td]:border-[var(--line)] last:[&>td]:border-b-0"
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
                            <p className="mt-1 font-mono text-xs font-extrabold text-[var(--primary)]">{stock.sparePart.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold">{stock.sparePart.itemCode ?? "-"}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold">{stock.sparePart.category?.name ?? "-"}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{stock.sparePart.materialGroup?.name ?? "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold">{stock.sparePart.type?.code ?? "-"}</p>
                        {stock.sparePart.type?.name ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">{stock.sparePart.type.name}</p>
                        ) : null}
                      </td>
                      <td className="py-3 pl-4 pr-1">
                        <p className="font-semibold">{stock.store.name}</p>
                        <p className="text-xs text-[var(--muted)]">{stock.store.location ?? stock.store.code}</p>
                      </td>
                      <td className="py-3 pl-1 pr-3 text-right">
                        <p className="font-extrabold">{formatQuantity(quantity)}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {stock.sparePart.unit}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold">
                          {stock.sparePart.maxStock == null ? "-" : formatQuantity(Number(stock.sparePart.maxStock))}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[var(--muted)]">
                          {formatQuantity(Number(stock.sparePart.minStock))}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StockStatusPill minStock={Number(stock.sparePart.minStock)} quantity={quantity} />
                      </td>
                      <td className="px-4 py-3 text-left font-semibold">{canViewValue ? formatMoney(quantity * unitPrice) : "—"}</td>
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
                          </div>
                          {canManageParts ? (
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
                                  href={sparePartEditHref(stock.sparePart.id)}
                                  storageKey={stockListPositionKey}
                                  targetId={`stock-row-${stock.sparePart.id}`}
                                >
                                  <Edit3 size={15} />
                                  แก้ไข
                                </PreserveListPositionLink>
                                <form action={deleteSparePartFromStockAction}>
                                  <AdminScopeHiddenFields scope={scope} />
                                  <input name="sparePartId" type="hidden" value={stock.sparePart.id} />
                                  <ConfirmSubmitButton
                                    className="inline-flex min-h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-red-600 transition hover:bg-red-500/10"
                                    message={`ต้องการลบอะไหล่ ${stock.sparePart.name} หรือไม่?`}
                                  >
                                    ลบ
                                  </ConfirmSubmitButton>
                                </form>
                              </div>
                            </ExclusiveDetails>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!visibleStocks.length ? (
              <div className="p-10 text-center text-sm text-[var(--muted)]">ไม่พบรายการสต็อกตามตัวกรองที่เลือก</div>
            ) : null}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
            <span>
              แสดง {formatQuantity(pageStart)} ถึง {formatQuantity(pageEnd)} จาก {formatQuantity(groupedVisibleStocks.length)} รายการ · หน้า{" "}
              {currentPage}/{totalPages}
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
                <form action="/dashboardstore/stock#stock-table-region" aria-label="ไปยังหน้าที่ต้องการ" className="flex items-center gap-1" method="get">
                  <input name="organizationId" type="hidden" value={scope.organization.id} />
                  <input name="plantId" type="hidden" value={scope.plant.id} />
                  {search ? <input name="search" type="hidden" value={search} /> : null}
                  {query.storeId ? <input name="storeId" type="hidden" value={query.storeId} /> : null}
                  {query.typeId ? <input name="typeId" type="hidden" value={query.typeId} /> : null}
                  {query.categoryId ? <input name="categoryId" type="hidden" value={query.categoryId} /> : null}
                  {query.materialGroupId ? <input name="materialGroupId" type="hidden" value={query.materialGroupId} /> : null}
                  {query.itemKind ? <input name="itemKind" type="hidden" value={query.itemKind} /> : null}
                  {query.unit ? <input name="unit" type="hidden" value={query.unit} /> : null}
                  {stockStatus !== "all" ? <input name="stockStatus" type="hidden" value={stockStatus} /> : null}
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
                  <button className="h-9 rounded-xl bg-[var(--primary)] px-3 font-bold text-white transition hover:bg-[var(--primary-strong)]" type="submit">
                    ไป
                  </button>
                </form>
              ) : null}
              <span className="rounded-full bg-[var(--soft)] px-3 py-1 font-bold">Site: {scope.plant.name}</span>
            </div>
          </footer>
        </section>

        {editPart && canManageParts ? (
          <aside
            className="stock-right-sidebar fixed bottom-0 right-0 z-[80] w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-6"
            id="edit-spare-part"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[var(--primary)]">Edit Spare Part</p>
                <h2 className="mt-1 text-2xl font-extrabold">{editPart.name}</h2>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">{editPart.code}</p>
              </div>
              <Link className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold" href={`${stockPageHref(currentPage)}#stock-row-${editPart.id}`} scroll={false}>
                ปิด
              </Link>
            </div>
            <form action={updateSparePartFromStockAction} className="mt-5 grid gap-4">
              <AdminScopeHiddenFields scope={scope} />
              <input name="sparePartId" type="hidden" value={editPart.id} />
              <input name="returnTo" type="hidden" value={`${stockPageHref(currentPage)}#stock-row-${editPart.id}`} />
              <label className={labelClass}>
                ชนิดรายการ
                <select
                  aria-disabled={user.role !== "ADMIN"}
                  className={`${inputClass} ${user.role === "ADMIN" ? "" : "pointer-events-none bg-[var(--soft)] text-[var(--muted)]"}`}
                  defaultValue={editPart.itemKind}
                  name="itemKind"
                  required
                  tabIndex={user.role === "ADMIN" ? 0 : -1}
                >
                  <option value="SPARE_PART">อะไหล่</option>
                  <option value="CHEMICAL">สารเคมี</option>
                  <option value="OIL">น้ำมัน</option>
                </select>
              </label>
              <label className={labelClass}>
                ชื่ออะไหล่
                <input className={inputClass} defaultValue={editPart.name} name="name" required />
              </label>
              <label className={labelClass}>
                Item code
                <input className={inputClass} defaultValue={editPart.itemCode ?? ""} maxLength={20} name="itemCode" required />
              </label>
              <label className={labelClass}>
                คลังอะไหล่
                <select className={inputClass} defaultValue={editPart.defaultStoreId ?? ""} name="defaultStoreId" required>
                  <option value="" disabled>เลือกคลังอะไหล่</option>
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.code} · {store.name}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                ประเภทอะไหล่ / ค่าใช้จ่าย
                <select className={inputClass} defaultValue={editPart.typeId ?? ""} name="typeId" required>
                  <option value="" disabled>เลือกประเภท</option>
                  {sparePartTypes.map((type) => <option key={type.id} value={type.id}>{type.code} · {type.name}</option>)}
                </select>
              </label>
              <SparePartClassificationFields
                categories={categories}
                className={inputClass}
                defaultCategoryId={editPart.categoryId ?? ""}
                defaultMaterialGroupId={editPart.materialGroupId ?? ""}
                groups={materialGroups}
                key={editPart.id}
              />
              <label className={labelClass}>
                หน่วยนับ
                <input className={inputClass} defaultValue={editPart.unit} name="unit" required />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className={labelClass}>
                  Min
                  <input className={inputClass} defaultValue={Number(editPart.minStock)} min="0" name="minStock" step="0.01" type="number" />
                </label>
                <label className={labelClass}>
                  Max
                  <input className={inputClass} defaultValue={editPart.maxStock == null ? "" : Number(editPart.maxStock)} min="0" name="maxStock" step="0.01" type="number" />
                </label>
                <label className={labelClass}>
                  Reorder Point
                  <input className={inputClass} defaultValue={Number(editPart.reorderPoint)} min="0" name="reorderPoint" step="0.01" type="number" required />
                </label>
              </div>
              {canViewValue ? (
                <label className={labelClass}>
                  ราคาล่าสุด
                  <input className={inputClass} defaultValue={editPart.latestUnitPrice == null ? "" : Number(editPart.latestUnitPrice)} min="0" name="latestUnitPrice" step="0.01" type="number" />
                </label>
              ) : null}
              <label className={labelClass}>
                รายละเอียด
                <textarea className={`${inputClass} min-h-24 py-3`} defaultValue={editPart.description ?? ""} name="description" />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                <label className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--soft)] px-4 text-sm font-bold">
                  <input className="size-4 accent-[var(--primary)]" defaultChecked={editPart.active} name="active" type="checkbox" />
                  เปิดใช้งาน
                </label>
                <button className={primaryButtonClass}>บันทึกอะไหล่</button>
              </div>
            </form>
          </aside>
        ) : null}

        {selectedStock && stockAction ? (
          <aside
            className="stock-right-sidebar fixed bottom-0 right-0 z-[80] w-full max-w-lg overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-6"
            id="stock-action-drawer"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[var(--primary)]">
              {stockAction === "issue" ? "Issue Stock" : stockAction === "receive" ? "Receive Stock" : "Adjust Stock"}
                </p>
                <h2 className="mt-1 text-2xl font-extrabold">{selectedStock.sparePart.name}</h2>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">{selectedStock.sparePart.code}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {selectedStock.store.name} · คงเหลือ {formatQuantity(Number(selectedStock.quantity))} {selectedStock.sparePart.unit}
                </p>
              </div>
              <Link className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold" href={`${stockPageHref(currentPage)}#stock-row-${selectedStock.sparePart.id}`} scroll={false}>
                ปิด
              </Link>
            </div>

            {stockAction === "issue" ? (
              <form action={createOneIssueAction} className="mt-5 grid gap-4">
                <AdminScopeHiddenFields scope={scope} />
                <input name="stockKey" type="hidden" value={`${selectedStock.storeId}:${selectedStock.sparePartId}`} />
                <label className={labelClass}>
                  Zone ที่นำอะไหล่ไปใช้งาน
                  <select
                    className={inputClass}
                    disabled={!issueZones.length}
                    name="zoneId"
                    required
                  >
                    <option value="">
                      {issueZones.length
                        ? "เลือก Zone"
                        : "Site นี้ยังไม่มี Applicable Zone ที่เปิดใช้งาน"}
                    </option>
                    {issueZones.map((assignment) => (
                      <option key={assignment.zone.id} value={assignment.zone.id}>
                        {assignment.code} · {assignment.zone.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  จำนวนที่ต้องการเบิก
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    max={Math.floor(Number(selectedStock.quantity))}
                    min="1"
                    name="quantity"
                    required
                    step="1"
                    type="number"
                  />
                </label>
                <label className={labelClass}>
                  หมายเหตุ
                  <textarea className={`${inputClass} min-h-24 py-3`} name="note" placeholder="ระบุเหตุผลหรือรายละเอียดการเบิก" />
                </label>
                <button
                  className={primaryButtonClass}
                  disabled={!issueZones.length}
                >
                  สร้างใบเบิก
                </button>
              </form>
            ) : null}

            {stockAction === "receive" ? (
              <form action={receiveOneStockAction} className="mt-5 grid gap-4">
                <AdminScopeHiddenFields scope={scope} />
                <input name="stockKey" type="hidden" value={`${selectedStock.storeId}:${selectedStock.sparePartId}`} />
                <label className={labelClass}>
                  จำนวนรับเข้า
                  <input className={inputClass} min="0.01" name="quantity" required step="0.01" type="number" />
                </label>
                <label className={labelClass}>
                  ราคาต่อหน่วย
                  <input className={inputClass} min="0" name="unitPrice" step="0.01" type="number" />
                </label>
                <label className={labelClass}>
                  Supplier
                  <input className={inputClass} name="supplierName" />
                </label>
                <label className={labelClass}>
                  Reference No.
                  <input className={inputClass} name="referenceNo" />
                </label>
                <label className={labelClass}>
                  หมายเหตุ
                  <textarea className={`${inputClass} min-h-24 py-3`} name="note" />
                </label>
                <button className={primaryButtonClass}>รับเข้า Stock</button>
              </form>
            ) : null}

            {stockAction === "adjust" ? (
              <form action={adjustStockAction} className="mt-5 grid gap-4">
                <AdminScopeHiddenFields scope={scope} />
                <input name="stockKey" type="hidden" value={`${selectedStock.storeId}:${selectedStock.sparePartId}`} />
                <label className={labelClass}>
                  จำนวนที่ปรับ (+/-)
                  <input className={inputClass} name="quantityChange" required step="0.01" type="number" />
                </label>
                <label className={labelClass}>
                  เหตุผล
                  <input className={inputClass} name="reason" placeholder="เช่น ตรวจนับประจำเดือน" required />
                </label>
                <button className={primaryButtonClass}>บันทึกปรับยอด</button>
              </form>
            ) : null}
          </aside>
        ) : null}

        {query.importExcel === "1" && canManageParts ? (
          <>
            <Link
              aria-label="ปิดหน้าต่างนำเข้า Excel"
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
              href={scopedHref}
            />
            <aside
              className="stock-right-sidebar fixed bottom-0 right-0 z-[80] w-full max-w-2xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7"
              id="excel-import-drawer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <FileSpreadsheet size={23} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--primary)]">Excel Import</p>
                    <h2 className="text-2xl font-extrabold">นำเข้ารายการอะไหล่</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {scope.organization.name} · {scope.plant.name}
                    </p>
                  </div>
                </div>
                <Link
                  aria-label="ปิด"
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--soft)] transition hover:bg-[var(--line)]"
                  href={scopedHref}
                >
                  <X size={19} />
                </Link>
              </div>

              {query.importError ? (
                <p className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-300" role="alert">
                  {query.importError}
                </p>
              ) : null}

              <section className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--soft)] p-4">
                <h3 className="font-extrabold">1. ดาวน์โหลดไฟล์แม่แบบ</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  กรอกเฉพาะ Sheet Spare_Parts_Import ห้ามแก้ชื่อ Sheet หรือหัวคอลัมน์
                </p>
                <a
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] transition hover:-translate-y-0.5"
                  download
                  href="/templates/spare-parts-import-template.xlsx"
                >
                  <Download size={17} />
                  ดาวน์โหลด Excel Template
                </a>
              </section>

              <section className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <h3 className="font-extrabold">2. รหัสที่ใช้ได้ใน Site นี้</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">ใช้รหัสตามรายการนี้เท่านั้น ระบบไม่รับชื่อแทนรหัส</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ReferenceCodeList
                    emptyText="ยังไม่มีคลังอะไหล่"
                    items={stores.map((store) => ({ code: store.code, name: store.name }))}
                    title="คลังอะไหล่"
                  />
                  <ReferenceCodeList
                    emptyText="ยังไม่มีประเภท"
                    items={sparePartTypes.map((type) => ({ code: type.code, name: type.name }))}
                    title="ประเภท"
                  />
                  <ReferenceCodeList
                    emptyText="ยังไม่มีหมวดหมู่"
                    items={categories.flatMap((category) =>
                      category.code ? [{ code: category.code, name: category.name }] : [],
                    )}
                    title="หมวดหมู่"
                  />
                </div>
              </section>

              <form action={importSparePartsExcelAction} className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <AdminScopeHiddenFields scope={scope} />
                <h3 className="font-extrabold">3. เลือกไฟล์และนำเข้า</h3>
                <label className="mt-3 grid gap-2 text-sm font-bold">
                  ไฟล์ Excel (.xlsx หรือ .xls ไม่เกิน 5 MB)
                  <input
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="block w-full rounded-xl border border-dashed border-[var(--line)] bg-[var(--soft)] p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--primary)] file:px-4 file:py-2 file:font-bold file:text-white"
                    name="excelFile"
                    required
                    type="file"
                  />
                </label>
                <div className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                  ระบบตรวจทุกแถวก่อนบันทึก หากพบข้อผิดพลาดจะไม่เพิ่มข้อมูลใด ยอดตั้งต้นจะถูกบันทึกเป็นประวัติปรับยอดอัตโนมัติ
                </div>
                <button className={`${primaryButtonClass} mt-4 w-full`} type="submit">
                  ตรวจสอบและนำเข้ารายการอะไหล่
                </button>
              </form>
            </aside>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function SummaryCard({
  color,
  icon,
  label,
  sublabel,
  value,
}: {
  color: "blue" | "green" | "violet" | "orange" | "red";
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  value: string;
}) {
  const surfaceClass = {
    blue: "stock-summary-blue",
    green: "stock-summary-green",
    violet: "stock-summary-violet",
    orange: "stock-summary-orange",
    red: "stock-summary-red",
  }[color];

  return (
    <article className={`stock-summary-card relative min-h-36 overflow-hidden rounded-2xl border p-4 transition duration-300 hover:-translate-y-0.5 sm:p-5 ${surfaceClass}`}>
      <div className="relative z-10 flex h-full items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold leading-5">{label}</p>
          <p className="mt-3 break-words text-2xl font-black tracking-tight sm:text-3xl">{value}</p>
          <p className="mt-2 text-xs font-bold text-[var(--muted)]">{sublabel}</p>
        </div>
        <span className="stock-summary-icon grid size-11 shrink-0 place-items-center rounded-xl">
          {icon}
        </span>
      </div>
    </article>
  );
}

function StockStatusPill({ quantity, minStock }: { quantity: number; minStock: number }) {
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

function ReferenceCodeList({
  emptyText,
  items,
  title,
}: {
  emptyText: string;
  items: Array<{ code: string; name: string }>;
  title: string;
}) {
  return (
    <div className="min-w-0 rounded-xl bg-[var(--soft)] p-3">
      <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">{title}</p>
      <div className="mt-2 grid max-h-40 gap-1.5 overflow-y-auto">
        {items.length ? items.map((item) => (
          <p className="min-w-0 text-xs" key={item.code}>
            <span className="font-mono font-extrabold text-[var(--primary)]">{item.code}</span>
            <span className="ml-1 text-[var(--muted)]">{item.name}</span>
          </p>
        )) : <p className="text-xs text-[var(--muted)]">{emptyText}</p>}
      </div>
    </div>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

function optionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? Number(normalized) : null;
}

function stockRedirect(scope: { organization: { id: string }; plant: { id: string } }, saved: string) {
  return `/dashboardstore/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}&saved=${saved}`;
}

function adjustmentErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "โปรดลองใหม่อีกครั้ง";
  if (
    error.message.includes("reason is required") ||
    error.message.includes("must not be zero") ||
    error.message.includes("must not be negative") ||
    error.message.includes("outside the selected Site")
  ) {
    return error.message;
  }
  return "ไม่สามารถปรับยอดได้ โปรดตรวจสอบข้อมูลและลองใหม่";
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

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold";
const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--soft)]";
const clearButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--soft)]";
const primaryButtonClass =
  "min-h-12 rounded-xl bg-[var(--primary)] px-5 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]";
const rowActionBaseClass =
  "inline-flex min-h-8 w-[4.75rem] items-center justify-start gap-1 rounded-full px-2 text-xs font-extrabold transition hover:-translate-y-0.5 hover:text-white";
const issueRowActionClass = `${rowActionBaseClass} bg-red-500/10 text-red-600 hover:bg-red-600`;
const receiveRowActionClass = `${rowActionBaseClass} bg-blue-500/10 text-blue-700 hover:bg-blue-600 dark:text-blue-300`;
const rowActionIconClass = "inline-flex w-4 shrink-0 items-center justify-center";
const rowActionLabelClass = "min-w-0 flex-1 whitespace-nowrap text-left leading-none";
