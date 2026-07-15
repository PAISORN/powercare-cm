import {
  Boxes,
  Building2,
  CirclePlus,
  Flag,
  Grid3X3,
  Layers3,
  LockKeyhole,
  MoreVertical,
  Save,
  Tags,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { AppShell } from "../../../components/app-shell";
import { AutoSubmitSelect } from "../../../components/auto-submit-select";
import { ConfirmSubmitButton } from "../../../components/confirm-submit-button";
import { StockHeaderReplacementController } from "../../../components/stock-header-replacement-controller";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import { canUseUserPermission, PermissionKey } from "../../../modules/auth/site-admin-permissions";
import { adminScopeSearchFromFormData } from "../../../modules/admin/admin-site-scope";
import {
  createSparePart,
  createSparePartCategory,
  createSparePartType,
  createStore,
  deleteSparePartCategory,
  deleteSparePartType,
  deleteStore,
  updateSparePart,
  updateSparePartCategory,
  updateSparePartType,
  updateStore,
  updateStoreApplicableZones,
  updateStoreSiteCode,
} from "../../../modules/store/store-prisma-service";
import { resolveStorePageScope } from "../../../modules/store/store-page-scope";

type PageQuery = {
  organizationId?: string;
  plantId?: string;
  saved?: string;
  error?: string;
  editPartId?: string;
};

async function addSparePartCategory(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  await createSparePartCategory(user, await toStoreScope(scope), {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
  });
  redirect(pageUrl(scope, "part-category"));
}

async function saveSparePartCategory(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const storeScope = await toStoreScope(scope);
  const id = String(formData.get("id") ?? "");
  if (formData.get("intent") === "delete") await deleteSparePartCategory(user, storeScope, id);
  else {
    await updateSparePartCategory(user, storeScope, id, {
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      active: formData.get("active") === "on",
    });
  }
  redirect(pageUrl(scope, "part-category-updated"));
}

async function addSparePartType(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  await createSparePartType(user, await toStoreScope(scope), {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
  });
  redirect(pageUrl(scope, "part-type"));
}

async function saveSparePartType(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const storeScope = await toStoreScope(scope);
  const id = String(formData.get("id") ?? "");
  if (formData.get("intent") === "delete") await deleteSparePartType(user, storeScope, id);
  else {
    await updateSparePartType(user, storeScope, id, {
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      active: formData.get("active") === "on",
    });
  }
  redirect(pageUrl(scope, "part-type-updated"));
}

async function saveStore(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const storeScope = await toStoreScope(scope);
  const id = String(formData.get("id") ?? "");
  if (formData.get("intent") === "delete") await deleteStore(user, storeScope, id);
  else {
    await updateStore(user, storeScope, id, {
      name: String(formData.get("name") ?? ""),
      code: String(formData.get("code") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      location: String(formData.get("location") ?? ""),
      active: formData.get("active") === "on",
    });
  }
  redirect(pageUrl(scope, "store-updated"));
}

async function addStore(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  await createStore(user, await toStoreScope(scope), {
    name: String(formData.get("name") ?? ""),
    code: String(formData.get("code") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    location: String(formData.get("location") ?? ""),
  });
  redirect(pageUrl(scope, "store"));
}

async function addSparePart(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  await createSparePart(user, await toStoreScope(scope), {
    name: String(formData.get("name") ?? ""),
    itemCode: String(formData.get("itemCode") ?? ""),
    description: String(formData.get("description") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    typeId: String(formData.get("typeId") ?? ""),
    defaultStoreId: String(formData.get("defaultStoreId") ?? ""),
    minStock: Number(formData.get("minStock") ?? 0),
    maxStock: optionalNumber(formData.get("maxStock")),
    reorderPoint: Number(formData.get("reorderPoint") ?? 0),
    latestUnitPrice: optionalNumber(formData.get("latestUnitPrice")),
    active: formData.get("active") === "on",
  });
  redirect(pageUrl(scope, "spare-part"));
}

async function updateSparePartAction(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  await updateSparePart(user, await toStoreScope(scope), String(formData.get("sparePartId") ?? ""), {
    name: String(formData.get("name") ?? ""),
    itemCode: String(formData.get("itemCode") ?? ""),
    description: String(formData.get("description") ?? ""),
    unit: String(formData.get("unit") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    typeId: String(formData.get("typeId") ?? ""),
    defaultStoreId: String(formData.get("defaultStoreId") ?? ""),
    minStock: Number(formData.get("minStock") ?? 0),
    maxStock: optionalNumber(formData.get("maxStock")),
    reorderPoint: Number(formData.get("reorderPoint") ?? 0),
    latestUnitPrice: optionalNumber(formData.get("latestUnitPrice")),
    active: formData.get("active") === "on",
  });
  redirect(pageUrl(scope, "spare-part-updated"));
}

async function configureStoreCode(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  await updateStoreSiteCode(
    user,
    { organizationId: scope.organization.id, plantId: scope.plant.id },
    String(formData.get("inventoryCode") ?? ""),
  );
  redirect(pageUrl(scope, "store-code"));
}

async function saveStoreApplicableZones(formData: FormData) {
  "use server";
  const user = await requireUser();
  const scope = await resolveStorePageScope(user, adminScopeSearchFromFormData(formData));
  const assignments = formData.getAll("zoneIds").map((value) => {
    const zoneId = String(value);
    return {
      zoneId,
      code: String(formData.get(`zoneCode:${zoneId}`) ?? ""),
      active: formData.get(`zoneActive:${zoneId}`) === "on",
    };
  });
  await updateStoreApplicableZones(user, await toStoreScope(scope), assignments);
  redirect(pageUrl(scope, "applicable-zones"));
}

export default async function SparePartsPage({ searchParams }: { searchParams: Promise<PageQuery> }) {
  const user = await requireUser();
  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const canManageParts = canUseUserPermission(user, PermissionKey.MANAGE_SPARE_PARTS);
  const canManageStore = canUseUserPermission(user, PermissionKey.MANAGE_STORE);
  const canView =
    canManageParts ||
    canManageStore ||
    canUseUserPermission(user, PermissionKey.VIEW_STORE_STOCK) ||
    canUseUserPermission(user, PermissionKey.RECEIVE_STOCK);
  if (!canView) redirect("/dashboard");

  const [plantConfig, stores, partCategories, partTypes, zones, storeApplicableZones, spareParts] = await Promise.all([
    db.plant.findUniqueOrThrow({
      where: { id: scope.plant.id },
      select: { inventoryCode: true },
    }),
    db.store.findMany({
      where: { plantId: scope.plant.id },
      include: { category: true, _count: { select: { stocks: true } } },
      orderBy: { name: "asc" },
    }),
    db.sparePartCategory.findMany({ where: { plantId: scope.plant.id }, orderBy: { name: "asc" } }),
    db.sparePartType.findMany({ where: { plantId: scope.plant.id }, orderBy: { name: "asc" } }),
    db.zone.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { name: "asc" } }),
    db.storeApplicableZone.findMany({ where: { plantId: scope.plant.id }, orderBy: { code: "asc" } }),
    db.sparePart.findMany({
      where: { plantId: scope.plant.id },
      include: {
        category: true,
        type: true,
        defaultStore: true,
        stocks: { include: { store: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const editPart = query.editPartId ? spareParts.find((part) => part.id === query.editPartId) : null;
  const activeStores = stores.filter((store) => store.active);
  const activePartCategories = partCategories.filter((category) => category.active);
  const activePartTypes = partTypes.filter((type) => type.active);
  const applicableZoneByZoneId = new Map(storeApplicableZones.map((assignment) => [assignment.zoneId, assignment]));
  const scopedBaseUrl = `/inventory/spare-parts?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}`;
  const uncategorizedPartCount = spareParts.filter((part) => !part.categoryId).length;
  const categoryRows = [
    ...partCategories.map((category) => ({
      id: category.id,
      name: category.name,
      count: spareParts.filter((part) => part.categoryId === category.id).length,
    })),
    ...(uncategorizedPartCount
      ? [{ id: "uncategorized", name: "ไม่ระบุหมวด", count: uncategorizedPartCount }]
      : []),
  ];
  const totalPartValue = spareParts.reduce(
    (sum, part) =>
      sum +
      part.stocks.reduce(
        (stockSum, stock) => stockSum + Number(stock.quantity) * Number(part.latestUnitPrice ?? 0),
        0,
      ),
    0,
  );

  return (
    <AppShell>
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(5,22,38,0.96),rgba(7,42,63,0.9))] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-7">
          <div className="pointer-events-none absolute -right-8 -top-16 size-64 rounded-full border-[34px] border-cyan-300/5" />
          <div className="pointer-events-none absolute right-32 top-10 size-40 rotate-12 rounded-[2rem] border-[28px] border-cyan-300/5" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-extrabold text-cyan-300">
                <Boxes size={18} />
                Store Inventory
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Spare Parts</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-300 sm:text-base">
                จัดการหมวดอะไหล่ คลังอะไหล่ และข้อมูลอะไหล่แยกตาม Site พร้อมรหัสอะไหล่อัตโนมัติ
              </p>
            </div>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 text-sm font-extrabold text-cyan-50">
              <LockKeyhole size={16} />
              {scope.canSelectPlant ? "เลือก Site เพื่อจัดการ" : "Locked to your Site"}
            </span>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
          <form action="/inventory/spare-parts" className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]" method="get">
            <ScopeInfo
              icon={<Building2 size={20} />}
              label="Organization"
              value={
                scope.canSelectOrganization ? (
                  <AutoSubmitSelect className={scopeSelectClass} defaultValue={scope.organization.id} name="organizationId">
                    {scope.organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                ) : (
                  scope.organization.name
                )
              }
            />
            <ScopeInfo
              icon={<Flag size={20} />}
              label="Site"
              value={
                scope.canSelectPlant ? (
                  <AutoSubmitSelect className={scopeSelectClass} defaultValue={scope.plant.id} name="plantId">
                    {scope.plants.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.name}
                      </option>
                    ))}
                  </AutoSubmitSelect>
                ) : (
                  scope.plant.name
                )
              }
            />
            <ScopeInfo icon={<Grid3X3 size={20} />} label="Store Site Code" value={plantConfig.inventoryCode ?? "ยังไม่ตั้งค่า"} />
            {scope.canSelectOrganization || scope.canSelectPlant ? (
              <button className={`${primaryButtonClass} self-stretch`} type="submit">
                Apply
              </button>
            ) : null}
          </form>
          {canManageStore || canManageParts ? (
            <form action={configureStoreCode} className="mt-3 grid gap-3 border-t border-[var(--line)] pt-3 sm:grid-cols-[minmax(150px,260px)_auto]">
              <AdminScopeHiddenFields scope={scope} />
              <input
                className={inputClass}
                defaultValue={plantConfig.inventoryCode ?? ""}
                maxLength={3}
                minLength={3}
                name="inventoryCode"
                pattern="[A-Za-z0-9]{3}"
                placeholder="Store Site Code เช่น RTB"
                required
              />
              <button className={secondaryButtonClass}>แก้ไขข้อมูล Site</button>
            </form>
          ) : null}
        </section>

        {query.saved ? (
          <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            บันทึกข้อมูลเรียบร้อยแล้ว
          </p>
        ) : null}

        {(canManageParts || canManageStore) && plantConfig.inventoryCode ? (
          <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase text-[var(--primary)]">Spare Parts Master Data</p>
                <h2 className="mt-1 text-xl font-extrabold">ข้อมูลพื้นฐานและรหัสอ้างอิง</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  รหัสเหล่านี้ใช้สร้างรหัสรายการเบิกอัตโนมัติ แก้ไขได้ตาม Site และปิดใช้งานข้อมูลเดิมได้
                </p>
              </div>
              <span className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
                Site: {scope.plant.name}
              </span>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <MasterPanel icon={<Warehouse size={18} />} title="คลังอะไหล่" subtitle="รหัสคลัง เช่น SP01">
                {canManageStore ? (
                  <form action={addStore} className="grid gap-2 sm:grid-cols-[120px_1fr_1fr_auto]">
                    <AdminScopeHiddenFields scope={scope} />
                    <input className={inputClass} name="code" placeholder="SP01" required />
                    <input className={inputClass} name="name" placeholder="ชื่อคลัง" required />
                    <input className={inputClass} name="location" placeholder="ตำแหน่ง (ถ้ามี)" />
                    <button className={compactPrimaryButtonClass}>เพิ่ม</button>
                  </form>
                ) : null}
                <div className="mt-3 grid gap-2">
                  {stores.map((store) => (
                    <form action={saveStore} className={masterRowWideClass} key={store.id}>
                      <AdminScopeHiddenFields scope={scope} />
                      <input name="id" type="hidden" value={store.id} />
                      <input className={compactInputClass} defaultValue={store.code} name="code" required />
                      <input className={compactInputClass} defaultValue={store.name} name="name" required />
                      <input className={compactInputClass} defaultValue={store.location ?? ""} name="location" placeholder="ตำแหน่ง" />
                      <input name="categoryId" type="hidden" value={store.categoryId ?? ""} />
                      <ActiveToggle defaultChecked={store.active} />
                      <MasterRowActions canEdit={canManageStore} deleteMessage={`ต้องการลบคลัง ${store.name} หรือไม่`} />
                    </form>
                  ))}
                  {!stores.length ? <EmptyMasterRow /> : null}
                </div>
              </MasterPanel>

              <MasterPanel icon={<Layers3 size={18} />} title="ประเภทอะไหล่ / ค่าใช้จ่าย" subtitle="รหัส เช่น GL630101">
                {canManageParts ? (
                  <form action={addSparePartType} className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
                    <AdminScopeHiddenFields scope={scope} />
                    <input className={inputClass} name="code" placeholder="GL630101" required />
                    <input className={inputClass} name="name" placeholder="ชื่อประเภท" required />
                    <button className={compactPrimaryButtonClass}>เพิ่ม</button>
                  </form>
                ) : null}
                <div className="mt-3 grid gap-2">
                  {partTypes.map((type) => (
                    <form action={saveSparePartType} className={masterRowCompactClass} key={type.id}>
                      <AdminScopeHiddenFields scope={scope} />
                      <input name="id" type="hidden" value={type.id} />
                      <input className={compactInputClass} defaultValue={type.code} name="code" required />
                      <input className={compactInputClass} defaultValue={type.name} name="name" required />
                      <ActiveToggle defaultChecked={type.active} />
                      <MasterRowActions canEdit={canManageParts} deleteMessage={`ต้องการลบประเภท ${type.name} หรือไม่`} />
                    </form>
                  ))}
                  {!partTypes.length ? <EmptyMasterRow /> : null}
                </div>
              </MasterPanel>

              <MasterPanel icon={<Tags size={18} />} title="หมวดหมู่อะไหล่" subtitle="รหัส เช่น EI, ME, INST">
                {canManageParts ? (
                  <form action={addSparePartCategory} className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                    <AdminScopeHiddenFields scope={scope} />
                    <input className={inputClass} name="code" placeholder="EI" required />
                    <input className={inputClass} name="name" placeholder="ชื่อหมวดหมู่" required />
                    <button className={compactPrimaryButtonClass}>เพิ่ม</button>
                  </form>
                ) : null}
                <div className="mt-3 grid gap-2">
                  {partCategories.map((category) => (
                    <form action={saveSparePartCategory} className={masterRowCompactClass} key={category.id}>
                      <AdminScopeHiddenFields scope={scope} />
                      <input name="id" type="hidden" value={category.id} />
                      <input className={compactInputClass} defaultValue={category.code ?? ""} name="code" required />
                      <input className={compactInputClass} defaultValue={category.name} name="name" required />
                      <ActiveToggle defaultChecked={category.active} />
                      <MasterRowActions canEdit={canManageParts} deleteMessage={`ต้องการลบหมวด ${category.name} หรือไม่`} />
                    </form>
                  ))}
                  {!partCategories.length ? <EmptyMasterRow /> : null}
                </div>
              </MasterPanel>

              <MasterPanel icon={<Flag size={18} />} title="Applicable Zones" subtitle="ใช้เฉพาะตอนเบิกอะไหล่ เช่น 01, 02">
                <form action={saveStoreApplicableZones} className="grid gap-2">
                  <AdminScopeHiddenFields scope={scope} />
                  {zones.map((zone) => {
                    const assignment = applicableZoneByZoneId.get(zone.id);
                    return (
                      <div className="grid min-h-12 grid-cols-[auto_minmax(0,1fr)_88px] items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3" key={zone.id}>
                        <input name="zoneIds" type="hidden" value={zone.id} />
                        <input
                          aria-label={`เปิดใช้ Zone ${zone.name} สำหรับการเบิกอะไหล่`}
                          className="size-4 accent-[var(--primary)]"
                          defaultChecked={assignment?.active ?? false}
                          name={`zoneActive:${zone.id}`}
                          type="checkbox"
                        />
                        <span className="truncate text-sm font-bold">{zone.name}</span>
                        <input
                          aria-label={`รหัส Zone ${zone.name}`}
                          className={`${compactInputClass} text-center font-mono`}
                          defaultValue={assignment?.code ?? ""}
                          maxLength={8}
                          name={`zoneCode:${zone.id}`}
                          placeholder="01"
                        />
                      </div>
                    );
                  })}
                  {!zones.length ? <EmptyMasterRow /> : null}
                  <button className={`${compactPrimaryButtonClass} mt-1 justify-self-end`} disabled={!zones.length}>
                    <Save size={16} />
                    บันทึก Applicable Zones
                  </button>
                </form>
              </MasterPanel>

            </div>
          </section>
        ) : null}

        {canManageParts && plantConfig.inventoryCode ? (
          <section className="grid gap-4 xl:grid-cols-[0.8fr_1.9fr]">
            <aside className="flex min-h-[520px] flex-col rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5">
              <div className="flex items-center gap-2">
                <Tags className="text-[var(--primary)]" size={22} />
                <h2 className="text-xl font-extrabold">หมวดอะไหล่</h2>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">สรุปรายการแยกตามหมวดที่ตั้งค่าไว้ด้านบน</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {categoryRows.map((category, index) => (
                  <button
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-3 text-left text-sm font-extrabold transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--soft)] ${
                      index === 0 ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "border-[var(--line)] bg-[var(--card)]"
                    }`}
                    key={category.id}
                    type="button"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Boxes className="shrink-0" size={16} />
                      <span className="truncate">{category.name}</span>
                    </span>
                    <span className="rounded-full bg-[var(--soft)] px-2 py-1 text-xs font-black text-[var(--ink)]">
                      {formatQuantity(category.count)}
                    </span>
                  </button>
                ))}
                {!categoryRows.length ? (
                  <p className="rounded-2xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
                    ยังไม่มีหมวดอะไหล่
                  </p>
                ) : null}
              </div>
              <p className="mt-auto pt-5 text-xs font-semibold text-[var(--muted)]">
                รวม {formatQuantity(spareParts.length)} รายการ · มูลค่าอะไหล่ {formatMoney(totalPartValue)}
              </p>
            </aside>

            <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5">
              <div className="flex items-center gap-2">
                <CirclePlus className="text-[var(--primary)]" size={22} />
                <h2 className="text-xl font-extrabold">เพิ่มอะไหล่</h2>
              </div>
              <form action={addSparePart} className="mt-4 grid gap-4 lg:grid-cols-2">
                <AdminScopeHiddenFields scope={scope} />
                <label className={labelClass}>
                  ชื่ออะไหล่
                  <input className={inputClass} name="name" placeholder="ระบุชื่ออะไหล่" required />
                </label>
                <label className={labelClass}>
                  Item code ฝ่ายบัญชี
                  <input className={inputClass} maxLength={20} name="itemCode" placeholder="ระบุ Item code" required />
                </label>
                <label className={labelClass}>
                  คลังอะไหล่
                  <select className={inputClass} name="defaultStoreId" defaultValue="" required>
                    <option value="" disabled>เลือกคลังอะไหล่</option>
                    {activeStores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.code} · {store.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  ประเภทอะไหล่ / ค่าใช้จ่าย
                  <select className={inputClass} name="typeId" defaultValue="" required>
                    <option value="" disabled>เลือกประเภท</option>
                    {activePartTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.code} · {type.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  หมวดหมู่อะไหล่
                  <select className={inputClass} name="categoryId" defaultValue="" required>
                    <option value="" disabled>เลือกหมวดหมู่</option>
                    {activePartCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.code} · {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  หน่วยนับ
                  <input className={inputClass} name="unit" placeholder="PCS, SET, M" required />
                </label>
                <label className={labelClass}>
                  Stock ขั้นต่ำ
                  <input className={inputClass} min="0" name="minStock" step="0.01" type="number" defaultValue="0" />
                </label>
                <label className={labelClass}>
                  Stock สูงสุด (Max)
                  <input className={inputClass} min="0" name="maxStock" step="0.01" type="number" placeholder="ไม่บังคับ" />
                </label>
                <label className={labelClass}>
                  จุดสั่งซื้อ (Reorder Point)
                  <input className={inputClass} defaultValue="0" min="0" name="reorderPoint" step="0.01" type="number" required />
                </label>
                <label className={labelClass}>
                  ราคาล่าสุด
                  <input className={inputClass} min="0" name="latestUnitPrice" step="0.01" type="number" placeholder="ระบุราคาล่าสุด" />
                </label>
                <label className={`${labelClass} lg:col-span-2`}>
                  รายละเอียด
                  <textarea className={`${inputClass} min-h-24 py-3`} name="description" placeholder="ระบุรายละเอียด (ไม่บังคับ)" />
                </label>
                <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--line)] pt-4 lg:col-span-2">
                  <label className="mr-auto inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--soft)] px-4 text-sm font-bold">
                    <input className="size-4 accent-[var(--primary)]" defaultChecked name="active" type="checkbox" />
                    เปิดใช้งาน
                  </label>
                  <button className={secondaryButtonClass} type="reset">
                    <X size={17} />
                    ยกเลิก
                  </button>
                  <button className={primaryButtonClass}>
                    <Save size={17} />
                    บันทึกอะไหล่
                  </button>
                </div>
              </form>
            </section>
          </section>
        ) : canManageParts ? (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
            กรุณาตั้งค่า Store Site Code 3 ตัวก่อนเพิ่มอะไหล่
          </p>
        ) : null}

        <StockHeaderReplacementController regionId="spare-parts-table-region" />
        <section
          className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
          id="spare-parts-table-region"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="p-5 pb-3 sm:p-6 sm:pb-3">
              <h2 className="text-xl font-extrabold">รายการอะไหล่</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{scope.plant.name}</p>
            </div>
            <span className="mr-5 rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold sm:mr-6">{spareParts.length} รายการ</span>
          </div>

          <div aria-hidden="true" className="stock-replacement-header" data-stock-replacement-header>
            <table className="w-full min-w-[1370px] table-fixed border-separate border-spacing-0 text-left text-sm">
              <SparePartsTableColGroup />
              <thead className="bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)]">
                <SparePartsTableHeaderRow />
              </thead>
            </table>
          </div>

          <div className="relative overflow-x-auto rounded-b-3xl bg-[var(--surface)]" data-stock-table-scroll>
            <table className="w-full min-w-[1370px] table-fixed border-separate border-spacing-0 text-left text-sm">
              <SparePartsTableColGroup />
              <thead
                className="sticky top-0 z-40 bg-[var(--soft)] text-xs font-extrabold text-[var(--muted)] shadow-[0_1px_0_var(--line)]"
                data-stock-table-header
              >
                <SparePartsTableHeaderRow />
              </thead>
              <tbody>
            {spareParts.map((part) => {
              const totalStock = part.stocks.reduce((sum, stock) => sum + Number(stock.quantity), 0);
              const lowStock = totalStock <= Number(part.minStock);
              return (
                <tr key={part.id} className="transition hover:bg-[var(--soft)]/60 [&>td]:border-b [&>td]:border-[var(--line)] last:[&>td]:border-b-0">
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{part.name}</p>
                      <p className="mt-1 font-mono text-xs font-extrabold text-[var(--primary)]">{part.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{part.itemCode ?? "-"}</td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-bold">{part.type?.name ?? "-"}</p>
                    <p className="text-[var(--muted)]">{part.type?.code ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-bold">{part.category?.name ?? "-"}</p>
                    <p className="text-[var(--muted)]">{part.category?.code ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="font-bold">{part.defaultStore?.name ?? "-"}</p>
                    <p className="text-[var(--muted)]">
                      {part.defaultStore?.code ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3">{part.unit}</td>
                  <td className="px-4 py-3 text-right text-xs">
                    <p>Max {part.maxStock == null ? "-" : formatQuantity(Number(part.maxStock))}</p>
                    <p>ROP {formatQuantity(Number(part.reorderPoint))}</p>
                    <p className="text-[var(--muted)]">Min {formatQuantity(Number(part.minStock))}</p>
                  </td>
                  <td className="px-4 py-3 text-right">{formatMoney(part.latestUnitPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-extrabold ${lowStock ? "text-red-600" : "text-emerald-600"}`}>{formatQuantity(totalStock)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManageParts ? (
                      <Link
                        aria-label={`แก้ไข ${part.name}`}
                        className="inline-flex size-9 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--ink)]"
                        href={`${scopedBaseUrl}&editPartId=${encodeURIComponent(part.id)}#edit-spare-part`}
                      >
                        <MoreVertical size={18} />
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
              </tbody>
            </table>
            {!spareParts.length ? (
              <div className="p-8 text-center text-sm text-[var(--muted)]">
                ยังไม่มีอะไหล่ใน Site นี้
              </div>
            ) : null}
          </div>
        </section>

        {editPart && canManageParts ? (
          <aside
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl sm:p-6"
            id="edit-spare-part"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[var(--primary)]">Edit Spare Part</p>
                <h2 className="mt-1 text-2xl font-extrabold">{editPart.name}</h2>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">{editPart.code}</p>
              </div>
              <Link className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-sm font-bold" href={scopedBaseUrl}>
                ปิด
              </Link>
            </div>
            <form action={updateSparePartAction} className="mt-5 grid gap-4">
              <AdminScopeHiddenFields scope={scope} />
              <input name="sparePartId" type="hidden" value={editPart.id} />
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
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.code} · {store.name}{store.active ? "" : " (ไม่ใช้งาน)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                ประเภทอะไหล่ / ค่าใช้จ่าย
                <select className={inputClass} defaultValue={editPart.typeId ?? ""} name="typeId" required>
                  <option value="" disabled>เลือกประเภท</option>
                  {partTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.code} · {type.name}{type.active ? "" : " (ไม่ใช้งาน)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                หมวดหมู่อะไหล่
                <select className={inputClass} defaultValue={editPart.categoryId ?? ""} name="categoryId" required>
                  <option value="" disabled>เลือกหมวดหมู่</option>
                  {partCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.code} · {category.name}{category.active ? "" : " (ไม่ใช้งาน)"}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                หน่วยนับ
                <input className={inputClass} defaultValue={editPart.unit} name="unit" required />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Min
                  <input className={inputClass} defaultValue={Number(editPart.minStock)} min="0" name="minStock" step="0.01" type="number" />
                </label>
                <label className={labelClass}>
                  Max
                  <input className={inputClass} defaultValue={editPart.maxStock == null ? "" : Number(editPart.maxStock)} min="0" name="maxStock" step="0.01" type="number" />
                </label>
                <label className={labelClass}>
                  จุดสั่งซื้อ
                  <input className={inputClass} defaultValue={Number(editPart.reorderPoint)} min="0" name="reorderPoint" step="0.01" type="number" required />
                </label>
                <label className={labelClass}>
                  ราคาล่าสุด
                  <input className={inputClass} defaultValue={editPart.latestUnitPrice == null ? "" : Number(editPart.latestUnitPrice)} min="0" name="latestUnitPrice" step="0.01" type="number" />
                </label>
              </div>
              <label className={labelClass}>
                รายละเอียด
                <textarea className={`${inputClass} min-h-24 py-3`} defaultValue={editPart.description ?? ""} name="description" />
              </label>
              <label className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--soft)] px-4 text-sm font-bold">
                <input className="size-4 accent-[var(--primary)]" defaultChecked={editPart.active} name="active" type="checkbox" />
                เปิดใช้งาน
              </label>
              <button className={primaryButtonClass}>บันทึกการแก้ไข</button>
            </form>
          </aside>
        ) : null}

      </div>
    </AppShell>
  );
}

function ScopeInfo({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-[var(--muted)]">{label}</p>
        {typeof value === "string" ? <p className="truncate text-sm font-extrabold">{value}</p> : value}
      </div>
    </div>
  );
}

function MasterPanel({
  children,
  icon,
  subtitle,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
          {icon}
        </span>
        <div>
          <h3 className="font-extrabold">{title}</h3>
          <p className="text-xs text-[var(--muted)]">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ActiveToggle({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--soft)] px-3 text-xs font-bold">
      <input className="size-4 accent-[var(--primary)]" defaultChecked={defaultChecked} name="active" type="checkbox" />
      ใช้งาน
    </label>
  );
}

function MasterRowActions({ canEdit, deleteMessage }: { canEdit: boolean; deleteMessage: string }) {
  if (!canEdit) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <button className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white" title="บันทึก">
        <Save size={16} />
      </button>
      <ConfirmSubmitButton
        className="inline-flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 transition hover:bg-red-500 hover:text-white"
        message={deleteMessage}
        name="intent"
        value="delete"
      >
        <Trash2 size={16} />
      </ConfirmSubmitButton>
    </div>
  );
}

function EmptyMasterRow() {
  return <p className="rounded-xl border border-dashed border-[var(--line)] p-3 text-sm text-[var(--muted)]">ยังไม่มีข้อมูล</p>;
}

function SparePartsTableColGroup() {
  return (
    <colgroup>
      <col className="w-[210px]" />
      <col className="w-[110px]" />
      <col className="w-[150px]" />
      <col className="w-[120px]" />
      <col className="w-[180px]" />
      <col className="w-[80px]" />
      <col className="w-[100px]" />
      <col className="w-[110px]" />
      <col className="w-[100px]" />
      <col className="w-[60px]" />
    </colgroup>
  );
}

function SparePartsTableHeaderRow() {
  return (
    <tr>
      <th className="px-4 py-3">รหัส / ชื่ออะไหล่</th>
      <th className="px-4 py-3">Item code</th>
      <th className="px-4 py-3">ประเภท</th>
      <th className="px-4 py-3">หมวดหมู่</th>
      <th className="px-4 py-3">คลังอะไหล่</th>
      <th className="px-4 py-3">หน่วย</th>
      <th className="px-4 py-3 text-right">Max / ROP / Min</th>
      <th className="px-4 py-3 text-right">ราคาล่าสุด</th>
      <th className="px-4 py-3 text-right">คงเหลือ</th>
      <th className="px-4 py-3" />
    </tr>
  );
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}

async function toStoreScope(scope: { organization: { id: string }; plant: { id: string } }) {
  const plant = await db.plant.findUniqueOrThrow({
    where: { id: scope.plant.id },
    select: { inventoryCode: true },
  });
  if (!plant.inventoryCode) {
    throw new Error("Store Site code must be configured before using Store Inventory.");
  }
  return {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
    plantCode: plant.inventoryCode,
  };
}

function pageUrl(scope: { organization: { id: string }; plant: { id: string } }, saved: string) {
  return `/inventory/spare-parts?organizationId=${encodeURIComponent(scope.organization.id)}&plantId=${encodeURIComponent(scope.plant.id)}&saved=${saved}`;
}

function formatMoney(value: { toString(): string } | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(Number(value));
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value);
}

const inputClass =
  "min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold text-[var(--ink)]";
const scopeSelectClass =
  "min-h-9 w-full rounded-xl border border-transparent bg-transparent p-0 text-sm font-extrabold text-[var(--ink)] outline-none";
const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]";
const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-5 font-bold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]";
const compactPrimaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--primary)] px-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]";
const compactInputClass =
  "min-h-10 min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)]";
const masterRowBaseClass =
  "grid items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2";
const masterRowCompactClass =
  `${masterRowBaseClass} sm:grid-cols-[120px_minmax(160px,1fr)_auto_auto]`;
const masterRowWideClass =
  `${masterRowBaseClass} sm:grid-cols-[120px_minmax(130px,1fr)_minmax(130px,1fr)_auto_auto]`;
