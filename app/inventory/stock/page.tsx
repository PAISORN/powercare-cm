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
import { StockHeaderReplacementController } from "../../../components/stock-header-replacement-controller";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import {
  canUseUserPermission,
  PermissionKey,
} from "../../../modules/auth/site-admin-permissions";
import { adjustStock } from "../../../modules/store/store-adjustment-prisma";
import { createLoggedInStoreIssue } from "../../../modules/store/store-issue-prisma";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";
import { deleteSparePart } from "../../../modules/store/store-prisma-service";
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
};

async function importSparePartsExcelAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  const baseUrl = `/inventory/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`;

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
    `/inventory/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}${
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
  ) redirect("/dashboard");

  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const canAdjust = canUseUserPermission(user, PermissionKey.ADJUST_STOCK);
  const canManageParts = canUseUserPermission(user, PermissionKey.MANAGE_SPARE_PARTS);
  const canReceive = canUseUserPermission(user, PermissionKey.RECEIVE_STOCK);
  const canIssue = canUseUserPermission(user, PermissionKey.CREATE_STORE_ISSUE);
  const search = query.search?.trim() ?? "";
  const stockStatus = query.stockStatus ?? "all";

  const [stores, categories, sparePartTypes, issueZones, units, stocks] = await Promise.all([
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
          ...(query.typeId ? { typeId: query.typeId } : {}),
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
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
            name: true,
            description: true,
            unit: true,
            minStock: true,
            maxStock: true,
            latestUnitPrice: true,
            category: { select: { name: true } },
            type: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: [{ store: { name: "asc" } }, { sparePart: { name: "asc" } }],
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
  const scopedHref = `/inventory/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`;
  const sparePartEditHref = (sparePartId: string) =>
    `/inventory/spare-parts?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}&editPartId=${encodeURIComponent(sparePartId)}#edit-spare-part`;
  const stockPageHref = (page: number) => {
    const params = new URLSearchParams({
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
    });
    if (search) params.set("search", search);
    if (query.storeId) params.set("storeId", query.storeId);
    if (query.typeId) params.set("typeId", query.typeId);
    if (query.categoryId) params.set("categoryId", query.categoryId);
    if (query.unit) params.set("unit", query.unit);
    if (stockStatus !== "all") params.set("stockStatus", stockStatus);
    if (page > 1) params.set("page", String(page));
    return `/inventory/stock?${params.toString()}`;
  };
  const selectedStock = query.stockId ? stocks.find((stock) => stock.id === query.stockId) : null;
  const requestedStockAction = selectedStock ? query.stockAction : undefined;
  const stockAction = requestedStockAction === "adjust" && !canAdjust ? undefined : requestedStockAction;

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--muted)]">Home &gt; Inventory &gt; Stock</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Stock (คลังอะไหล่)</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              ตรวจสอบยอดคงเหลือ มูลค่าคลัง จุดขั้นต่ำ และประวัติการเคลื่อนไหวของอะไหล่ใน Site
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]"
              href="/inventory/receive"
            >
              <PackagePlus size={17} />
              เพิ่มอะไหล่เข้าสต็อก
            </Link>
            {canManageParts ? (
              <Link className={secondaryButtonClass} href={`${scopedHref}&importExcel=1#excel-import-drawer`}>
                <Download size={17} />
                นำเข้า Excel
              </Link>
            ) : null}
            <Link className={secondaryButtonClass} href="/inventory/reports">
              <Printer size={17} />
              พิมพ์รายงาน
            </Link>
          </div>
        </header>

        <AdminSiteScopeSelector
          action="/inventory/stock"
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

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            color="blue"
            icon={<Boxes size={28} />}
            label="มูลค่าอะไหล่คงเหลือรวม"
            sublabel="บาท"
            value={formatMoney(totalValue)}
          />
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

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
          <form action="/inventory/stock" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.45fr_repeat(6,minmax(120px,0.7fr))_auto_auto] xl:items-end">
            <AdminScopeHiddenFields scope={scope} />
            <label className={labelClass}>
              ค้นหา
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} />
                <input className={`${inputClass} pl-10`} defaultValue={search} name="search" placeholder="ค้นหา รหัสอะไหล่, รายการอะไหล่, Part No." />
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
            <label className={labelClass}>
              หมวดหมู่
              <AutoSubmitSelect className={inputClass} defaultValue={query.categoryId ?? ""} name="categoryId">
                <option value="">ทั้งหมด</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </AutoSubmitSelect>
            </label>
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
          className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
          id="stock-table-region"
        >
          <div
            aria-hidden="true"
            className="stock-replacement-header"
            data-stock-replacement-header
          >
            <table className="w-full min-w-[1460px] table-fixed border-separate border-spacing-0 text-left text-sm">
              <StockTableColGroup />
              <thead className="bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)]">
                <tr>
                  <th className="w-20 px-4 py-4 text-center">ลำดับ</th>
                  <th className="px-4 py-4">ชื่อและรหัสอะไหล่</th>
                  <th className="px-4 py-4">Item code</th>
                  <th className="px-4 py-4">รายละเอียดอะไหล่</th>
                  <th className="px-4 py-4">หมวดหมู่</th>
                  <th className="px-4 py-4">ประเภท</th>
                  <th className="px-4 py-4">คลังอะไหล่ / ตำแหน่ง</th>
                  <th className="px-4 py-4 text-right">คงเหลือ</th>
                  <th className="px-4 py-4 text-right">Max / Min</th>
                  <th className="px-4 py-4">สถานะสต็อก</th>
                  <th className="px-4 py-4 text-left">มูลค่าอะไหล่</th>
                  <th className="w-[120px] px-2 py-4 text-right" />
                </tr>
              </thead>
            </table>
          </div>
          <div className="relative overflow-x-auto rounded-t-3xl bg-[var(--surface)]" data-stock-table-scroll>
            <table className="w-full min-w-[1460px] table-fixed border-separate border-spacing-0 text-left text-sm">
              <StockTableColGroup />
              <thead
                className="sticky top-0 z-40 bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)] shadow-[0_1px_0_var(--line)]"
                data-stock-table-header
              >
                <tr>
                  <th className="w-20 px-4 py-4 text-center">ลำดับ</th>
                  <th className="px-4 py-4">ชื่อและรหัสอะไหล่</th>
                  <th className="px-4 py-4">Item code</th>
                  <th className="px-4 py-4">รายละเอียดอะไหล่</th>
                  <th className="px-4 py-4">หมวดหมู่</th>
                  <th className="px-4 py-4">ประเภท</th>
                  <th className="px-4 py-4">คลังอะไหล่ / ตำแหน่ง</th>
                  <th className="px-4 py-4 text-right">คงเหลือ</th>
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
                      <td className="max-w-[240px] px-4 py-3 text-sm text-[var(--muted)]">
                        <span className="line-clamp-2">{stock.sparePart.description?.trim() || "-"}</span>
                      </td>
                      <td className="px-4 py-3">{stock.sparePart.category?.name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold">{stock.sparePart.type?.code ?? "-"}</p>
                        {stock.sparePart.type?.name ? (
                          <p className="mt-1 text-xs text-[var(--muted)]">{stock.sparePart.type.name}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{stock.store.name}</p>
                        <p className="text-xs text-[var(--muted)]">{stock.store.location ?? stock.store.code}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
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
                      <td className="px-4 py-3 text-left font-semibold">{formatMoney(quantity * unitPrice)}</td>
                      <td className="px-2 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className="grid gap-1">
                            {canIssue ? (
                              <Link className={issueRowActionClass} href={`${scopedHref}&stockAction=issue&stockId=${encodeURIComponent(stock.id)}#stock-action-drawer`}>
                                <span className={rowActionIconClass}>
                                  <ArrowUp size={14} />
                                </span>
                                <span className={rowActionLabelClass}>Issue</span>
                              </Link>
                            ) : null}
                            {canReceive ? (
                              <Link className={receiveRowActionClass} href={`${scopedHref}&stockAction=receive&stockId=${encodeURIComponent(stock.id)}#stock-action-drawer`}>
                                <span className={rowActionIconClass}>
                                  <ArrowDown size={14} />
                                </span>
                                <span className={rowActionLabelClass}>Receive</span>
                              </Link>
                            ) : null}
                          </div>
                          {canManageParts ? (
                            <details className="group relative">
                              <summary
                                aria-label={`จัดการ ${stock.sparePart.name}`}
                                className="inline-flex size-7 shrink-0 cursor-pointer list-none items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden"
                              >
                                <MoreVertical size={18} />
                              </summary>
                              <div className="absolute right-0 top-9 z-50 grid w-36 gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 text-sm font-bold shadow-xl">
                                <Link
                                  className="inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-[var(--ink)] transition hover:bg-[var(--soft)]"
                                  href={sparePartEditHref(stock.sparePart.id)}
                                >
                                  <Edit3 size={15} />
                                  แก้ไข
                                </Link>
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
                            </details>
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
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
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
              <span className="rounded-full bg-[var(--soft)] px-3 py-1 font-bold">Site: {scope.plant.name}</span>
            </div>
          </footer>
        </section>

        {selectedStock && stockAction ? (
          <aside
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-6"
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
              <Link className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold" href={scopedHref}>
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
                  <input className={inputClass} min="0.01" name="quantity" required step="0.01" type="number" />
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
              className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7"
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
  const colorClass = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    violet: "from-violet-500 to-violet-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600",
  }[color];

  return (
    <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <span className={`grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br text-white ${colorClass}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--muted)]">{label}</p>
          <p className="mt-1 truncate text-2xl font-extrabold">{value}</p>
          <p className="text-xs font-bold text-[var(--muted)]">{sublabel}</p>
        </div>
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
  return `/inventory/stock?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}&saved=${saved}`;
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
      <col style={{ width: "205px" }} />
      <col style={{ width: "100px" }} />
      <col style={{ width: "170px" }} />
      <col style={{ width: "105px" }} />
      <col style={{ width: "110px" }} />
      <col style={{ width: "180px" }} />
      <col style={{ width: "75px" }} />
      <col style={{ width: "75px" }} />
      <col style={{ width: "120px" }} />
      <col style={{ width: "140px" }} />
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
