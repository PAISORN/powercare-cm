import { ArrowDownToLine, Clock3, PackageCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminSiteScopeSelector } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { ReceiveStockForm } from "../../../components/store/receive-stock-form";
import { formatThaiMediumDateTime } from "../../../lib/date-time/bangkok-time";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import { receiveStock } from "../../../modules/store/store-receive-prisma";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";

type PageQuery = {
  organizationId?: string;
  plantId?: string;
  saved?: string;
};

async function receiveStockAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  if (!plant.inventoryCode) throw new Error("Store Site code must be configured before receiving stock.");
  const storeIds = formData.getAll("storeId").map(String);
  const sparePartIds = formData.getAll("sparePartId").map(String);
  const quantities = formData.getAll("quantity").map((value) => Number(value));
  const unitPrices = formData.getAll("unitPrice").map((value) => {
    const text = String(value).trim();
    return text ? Number(text) : null;
  });
  if (
    !storeIds.length ||
    storeIds.length !== sparePartIds.length ||
    storeIds.length !== quantities.length ||
    storeIds.length !== unitPrices.length
  ) {
    throw new Error("Receive stock items are incomplete.");
  }

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
      receivedAt: parseBangkokDateTime(String(formData.get("receivedAt") ?? "")),
      items: storeIds.map((storeId, index) => ({
        storeId,
        sparePartId: sparePartIds[index],
        quantity: quantities[index],
        unitPrice: unitPrices[index],
      })),
    },
  );

  redirect(
    `/inventory/receive?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}&saved=1`,
  );
}

export default async function ReceivePage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  if (!canUseUserPermission(user, PermissionKey.RECEIVE_STOCK)) redirect("/dashboard");
  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);

  const [plantConfig, stores, spareParts, recentReceives] = await Promise.all([
    db.plant.findUniqueOrThrow({ where: { id: scope.plant.id }, select: { inventoryCode: true } }),
    db.store.findMany({
      where: { plantId: scope.plant.id, active: true },
      select: { id: true, name: true, code: true, category: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    db.sparePart.findMany({
      where: { plantId: scope.plant.id, active: true },
      select: {
        id: true,
        name: true,
        code: true,
        itemCode: true,
        unit: true,
        minStock: true,
        category: { select: { name: true } },
        type: { select: { name: true } },
        stocks: { select: { storeId: true, quantity: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.sparePartReceive.findMany({
      where: { plantId: scope.plant.id },
      include: {
        receivedBy: { select: { fullName: true } },
        items: { select: { quantity: true, unitPrice: true } },
      },
      orderBy: { receivedAt: "desc" },
      take: 10,
    }),
  ]);

  function CompactReceiveRow({ receive }: { receive: (typeof recentReceives)[number] }) {
    const totalQuantity = receive.items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalValue = receive.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice ?? 0),
      0,
    );
    return (
      <article className="receive-row-two-line grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--primary)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
          <PackageCheck size={19} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-extrabold text-[var(--primary)]">{receive.number}</p>
          <p className="mt-1 truncate text-sm text-[var(--muted)]">
            {formatBangkokDate(receive.receivedAt)} · {receive.receivedBy?.fullName ?? "ไม่ระบุผู้รับ"} · {receive.items.length} รายการ · {totalQuantity} หน่วย
          </p>
        </div>
        <p className="font-extrabold">{formatMoney(totalValue)}</p>
      </article>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold text-[var(--primary)]">
            <ArrowDownToLine size={16} />
            Store Inventory
          </p>
          <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Receive Stock</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            รับอะไหล่เข้าคลังได้หลายรายการ ยอดคงเหลือและราคาล่าสุดจะอัปเดตทันที
          </p>
        </section>

        <AdminSiteScopeSelector
          action="/inventory/receive"
          scope={scope}
          title="Site สำหรับรับ Stock"
          description="Store Officer จะถูกล็อกไว้เฉพาะ Site ของตัวเอง"
        />

        {query.saved === "1" ? (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            รับ Stock และบันทึก Stock Movement เรียบร้อยแล้ว
          </p>
        ) : null}

        {!plantConfig.inventoryCode ? (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
            Site นี้ยังไม่ได้ตั้ง Store Site Code 3 ตัว กรุณาตั้งค่าที่หน้า Spare Parts ก่อนรับ Stock
          </p>
        ) : null}

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-6">
          <ReceiveStockForm
            action={receiveStockAction}
            organizationId={scope.organization.id}
            plantId={scope.plant.id}
            spareParts={plantConfig.inventoryCode ? spareParts.map((part) => ({
              id: part.id,
              name: part.name,
              code: part.code,
              itemCode: part.itemCode,
              unit: part.unit,
              minStock: Number(part.minStock),
              categoryName: part.category?.name,
              typeName: part.type?.name,
              stocks: part.stocks.map((stock) => ({ storeId: stock.storeId, quantity: Number(stock.quantity) })),
            })) : []}
            stores={plantConfig.inventoryCode ? stores.map((store) => ({
              id: store.id,
              name: store.name,
              code: store.code,
              categoryName: store.category?.name,
            })) : []}
          />
        </section>

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock3 className="text-[var(--primary)]" size={20} />
              <h2 className="text-xl font-extrabold">รับเข้าล่าสุด</h2>
            </div>
            <span className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold">{recentReceives.length} รายการ</span>
          </div>
          <div className="mt-4 grid gap-2">
            {recentReceives.map((receive) => {
              const totalQuantity = receive.items.reduce((sum, item) => sum + Number(item.quantity), 0);
              const totalValue = receive.items.reduce(
                (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice ?? 0),
                0,
              );
              return (
                <div key={receive.id}>
                  <CompactReceiveRow receive={receive} />
                  <article className="hidden grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                    <PackageCheck size={21} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-bold text-[var(--primary)]">{receive.number}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {formatBangkokDate(receive.receivedAt)} · {receive.receivedBy?.fullName ?? "ไม่ระบุผู้รับ"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {receive.items.length} รายการ · {totalQuantity} หน่วย
                    </p>
                  </div>
                  <p className="font-extrabold">{formatMoney(totalValue)}</p>
                  </article>
                </div>
              );
            })}
            {!recentReceives.length ? (
              <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
                ยังไม่มีประวัติรับ Stock ใน Site นี้
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function optionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function parseBangkokDateTime(value: string) {
  if (!value) throw new Error("Receive date is required.");
  const parsed = new Date(`${value}:00+07:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Receive date is invalid.");
  return parsed;
}

function formatBangkokDate(value: Date) {
  return formatThaiMediumDateTime(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}
