import {
  Boxes,
  ChevronDown,
  CirclePlus,
  Flag,
  Grid3X3,
  Layers3,
  Save,
  Tags,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { AdminScopeHiddenFields } from "../../../components/admin-site-scope-selector";
import { ConfirmSubmitButton } from "../../../components/confirm-submit-button";
import { SparePartClassificationFields } from "../../../components/store/spare-part-classification-fields";
import { SparePartsMasterModal } from "../../../components/store/spare-parts-master-modal";
import type { AdminSiteScope } from "../../../modules/admin/admin-site-scope";
import type { SparePartsPageData } from "../../../modules/store/spare-parts-page-data";
import type { SparePartsPageModel } from "../../../modules/store/spare-parts-page-model";
import {
  addSparePart,
  addSparePartCategory,
  addSparePartMaterialGroup,
  addSparePartType,
  addStore,
  configureStoreCode,
  saveSparePartCategory,
  saveSparePartMaterialGroup,
  saveSparePartType,
  saveStore,
  saveStoreApplicableZones,
} from "./actions";

export function SparePartsMasterData({
  canManageParts,
  canManageStore,
  canViewStockValue,
  data,
  model,
  scope,
}: {
  canManageParts: boolean;
  canManageStore: boolean;
  canViewStockValue: boolean;
  data: SparePartsPageData;
  model: SparePartsPageModel;
  scope: AdminSiteScope;
}) {
  const {
    materialGroups,
    partCategories,
    partTypes,
    plantConfig,
    spareParts,
    stores,
    zones,
  } = data;
  const {
    activeMaterialGroups,
    activePartCategories,
    activePartTypes,
    activeStores,
    applicableZoneByZoneId,
    categoryRows,
    totalPartValue,
  } = model;

  return (
    <>
      {" "}
      {canManageParts || canManageStore ? (
        <details className="group" data-testid="spare-parts-master-data-panel">
          <summary
            aria-label="จัดการ Master Data"
            className="absolute right-[8.5rem] top-0 flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--ink)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden"
          >
            <Grid3X3 aria-hidden="true" size={17} />
            <span>
              <span className="hidden sm:inline">จัดการ </span>Master Data
            </span>
            <ChevronDown
              aria-hidden="true"
              className="transition-transform duration-200 group-open:rotate-180"
              size={16}
            />
          </summary>
          <div className="mb-4 grid gap-5 pt-4">
            {" "}
            {(canManageParts || canManageStore) && plantConfig.inventoryCode ? (
              <section
                className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
                id="spare-parts-master-data"
              >
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] p-4 sm:p-5">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-[var(--primary)]">
                      Spare Parts Master Data
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold">
                      ข้อมูลพื้นฐานและรหัสอ้างอิง
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      เลือกหัวข้อที่ต้องการจัดการ ระบบจะเปิดเป็นหน้าต่าง Popup
                      โดยไม่ทำให้หน้าเดิมเลื่อน
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--soft)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
                    Site: {scope.plant.name}
                  </span>
                </header>

                <form
                  action={configureStoreCode}
                  className="grid gap-3 border-b border-[var(--line)] p-4 sm:grid-cols-[minmax(150px,260px)_auto] sm:p-5"
                >
                  <AdminScopeHiddenFields scope={scope} />
                  <input
                    aria-label="Store Site Code"
                    className={inputClass}
                    defaultValue={plantConfig.inventoryCode ?? ""}
                    maxLength={3}
                    minLength={3}
                    name="inventoryCode"
                    pattern="[A-Za-z0-9]{3}"
                    placeholder="Store Site Code เช่น RTB"
                    required
                  />
                  <button className={secondaryButtonClass}>
                    แก้ไขข้อมูล Site
                  </button>
                </form>

                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                  <MasterPanel
                    icon={<Warehouse size={18} />}
                    title="คลังอะไหล่"
                    subtitle="รหัสคลัง เช่น SP01"
                  >
                    {canManageStore ? (
                      <form
                        action={addStore}
                        className="grid gap-2 sm:grid-cols-[120px_1fr_1fr_auto]"
                      >
                        <AdminScopeHiddenFields scope={scope} />
                        <input
                          className={inputClass}
                          name="code"
                          placeholder="SP01"
                          required
                        />
                        <input
                          className={inputClass}
                          name="name"
                          placeholder="ชื่อคลัง"
                          required
                        />
                        <input
                          className={inputClass}
                          name="location"
                          placeholder="ตำแหน่ง (ถ้ามี)"
                        />
                        <button className={compactPrimaryButtonClass}>
                          เพิ่ม
                        </button>
                      </form>
                    ) : null}
                    <div className="mt-3 grid gap-2">
                      {stores.map((store) => (
                        <form
                          action={saveStore}
                          className={masterRowWideClass}
                          key={store.id}
                        >
                          <AdminScopeHiddenFields scope={scope} />
                          <input name="id" type="hidden" value={store.id} />
                          <input
                            className={compactInputClass}
                            defaultValue={store.code}
                            name="code"
                            required
                          />
                          <input
                            className={compactInputClass}
                            defaultValue={store.name}
                            name="name"
                            required
                          />
                          <input
                            className={compactInputClass}
                            defaultValue={store.location ?? ""}
                            name="location"
                            placeholder="ตำแหน่ง"
                          />
                          <input
                            name="categoryId"
                            type="hidden"
                            value={store.categoryId ?? ""}
                          />
                          <ActiveToggle defaultChecked={store.active} />
                          <MasterRowActions
                            canEdit={canManageStore}
                            deleteMessage={`ต้องการลบคลัง ${store.name} หรือไม่`}
                          />
                        </form>
                      ))}
                      {!stores.length ? <EmptyMasterRow /> : null}
                    </div>
                  </MasterPanel>

                  <MasterPanel
                    icon={<Layers3 size={18} />}
                    title="ประเภทอะไหล่ / ค่าใช้จ่าย"
                    subtitle="รหัส เช่น GL630101"
                  >
                    {canManageParts ? (
                      <form
                        action={addSparePartType}
                        className="grid gap-2 sm:grid-cols-[150px_1fr_auto]"
                      >
                        <AdminScopeHiddenFields scope={scope} />
                        <input
                          className={inputClass}
                          name="code"
                          placeholder="GL630101"
                          required
                        />
                        <input
                          className={inputClass}
                          name="name"
                          placeholder="ชื่อประเภท"
                          required
                        />
                        <button className={compactPrimaryButtonClass}>
                          เพิ่ม
                        </button>
                      </form>
                    ) : null}
                    <div className="mt-3 grid gap-2">
                      {partTypes.map((type) => (
                        <form
                          action={saveSparePartType}
                          className={masterRowCompactClass}
                          key={type.id}
                        >
                          <AdminScopeHiddenFields scope={scope} />
                          <input name="id" type="hidden" value={type.id} />
                          <input
                            className={compactInputClass}
                            defaultValue={type.code}
                            name="code"
                            required
                          />
                          <input
                            className={compactInputClass}
                            defaultValue={type.name}
                            name="name"
                            required
                          />
                          <ActiveToggle defaultChecked={type.active} />
                          <MasterRowActions
                            canEdit={canManageParts}
                            deleteMessage={`ต้องการลบประเภท ${type.name} หรือไม่`}
                          />
                        </form>
                      ))}
                      {!partTypes.length ? <EmptyMasterRow /> : null}
                    </div>
                  </MasterPanel>

                  <MasterPanel
                    icon={<Tags size={18} />}
                    title="หมวดหมู่อะไหล่"
                    subtitle="รหัส เช่น EI, ME, INST"
                  >
                    {canManageParts ? (
                      <form
                        action={addSparePartCategory}
                        className="grid gap-2 sm:grid-cols-[120px_1fr_auto]"
                      >
                        <AdminScopeHiddenFields scope={scope} />
                        <input
                          className={inputClass}
                          name="code"
                          placeholder="EI"
                          required
                        />
                        <input
                          className={inputClass}
                          name="name"
                          placeholder="ชื่อหมวดหมู่"
                          required
                        />
                        <button className={compactPrimaryButtonClass}>
                          เพิ่ม
                        </button>
                      </form>
                    ) : null}
                    <div className="mt-3 grid gap-2">
                      {partCategories.map((category) => (
                        <form
                          action={saveSparePartCategory}
                          className={masterRowCompactClass}
                          key={category.id}
                        >
                          <AdminScopeHiddenFields scope={scope} />
                          <input name="id" type="hidden" value={category.id} />
                          <input
                            className={compactInputClass}
                            defaultValue={category.code ?? ""}
                            name="code"
                            required
                          />
                          <input
                            className={compactInputClass}
                            defaultValue={category.name}
                            name="name"
                            required
                          />
                          <ActiveToggle defaultChecked={category.active} />
                          <MasterRowActions
                            canEdit={canManageParts}
                            deleteMessage={`ต้องการลบหมวด ${category.name} หรือไม่`}
                          />
                        </form>
                      ))}
                      {!partCategories.length ? <EmptyMasterRow /> : null}
                    </div>
                  </MasterPanel>

                  <MasterPanel
                    icon={<Grid3X3 size={18} />}
                    title="กลุ่มอะไหล่/วัสดุ"
                    subtitle="กลุ่มย่อยภายใต้หมวดหมู่ เช่น Electrical → ท่อ"
                  >
                    {canManageParts ? (
                      <form
                        action={addSparePartMaterialGroup}
                        className="grid gap-2 sm:grid-cols-[1fr_100px_1fr_auto]"
                      >
                        <AdminScopeHiddenFields scope={scope} />
                        <select
                          className={inputClass}
                          name="categoryId"
                          required
                          defaultValue=""
                        >
                          <option disabled value="">
                            เลือกหมวดหมู่
                          </option>
                          {activePartCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.code} · {category.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className={inputClass}
                          maxLength={40}
                          name="code"
                          pattern="[A-Za-z0-9][A-Za-z0-9._/-]*"
                          placeholder="รหัส เช่น PIPE"
                          required
                          title="กรอกรหัสภาษาอังกฤษ ตัวเลข จุด ขีดล่าง เครื่องหมาย / หรือ - เท่านั้น เช่น PIPE-01"
                        />
                        <input
                          className={inputClass}
                          name="name"
                          placeholder="ชื่อกลุ่ม เช่น ท่อ"
                          required
                        />
                        <button className={compactPrimaryButtonClass}>
                          เพิ่ม
                        </button>
                      </form>
                    ) : null}
                    <div className="mt-3 grid gap-2">
                      {materialGroups.map((group) => (
                        <form
                          action={saveSparePartMaterialGroup}
                          className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-2 sm:grid-cols-[1fr_100px_1fr_auto_auto]"
                          key={group.id}
                        >
                          <AdminScopeHiddenFields scope={scope} />
                          <input name="id" type="hidden" value={group.id} />
                          <select
                            className={compactInputClass}
                            defaultValue={group.categoryId}
                            name="categoryId"
                            required
                          >
                            {partCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.code} · {category.name}
                              </option>
                            ))}
                          </select>
                          <input
                            className={compactInputClass}
                            defaultValue={group.code}
                            maxLength={40}
                            name="code"
                            pattern="[A-Za-z0-9][A-Za-z0-9._/-]*"
                            required
                            title="กรอกรหัสภาษาอังกฤษ ตัวเลข จุด ขีดล่าง เครื่องหมาย / หรือ - เท่านั้น เช่น PIPE-01"
                          />
                          <input
                            className={compactInputClass}
                            defaultValue={group.name}
                            name="name"
                            required
                          />
                          <ActiveToggle defaultChecked={group.active} />
                          <MasterRowActions
                            canEdit={canManageParts}
                            deleteMessage={`ต้องการลบกลุ่ม ${group.name} หรือไม่`}
                          />
                        </form>
                      ))}
                      {!materialGroups.length ? <EmptyMasterRow /> : null}
                    </div>
                  </MasterPanel>

                  <MasterPanel
                    icon={<Flag size={18} />}
                    title="Applicable Zones"
                    subtitle="ใช้เฉพาะตอนเบิกอะไหล่ · ใช้ Zone ชุดเดียวกับ CM ของ Site นี้ และจัดรหัสว่างให้อัตโนมัติ"
                  >
                    <form
                      action={saveStoreApplicableZones}
                      className="grid gap-2"
                    >
                      <AdminScopeHiddenFields scope={scope} />
                      {zones.map((zone) => {
                        const assignment = applicableZoneByZoneId.get(zone.id);
                        return (
                          <div
                            className="grid min-h-12 grid-cols-[auto_minmax(0,1fr)_88px] items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3"
                            key={zone.id}
                          >
                            <input
                              name="zoneIds"
                              type="hidden"
                              value={zone.id}
                            />
                            <input
                              aria-label={`เปิดใช้ Zone ${zone.name} สำหรับการเบิกอะไหล่`}
                              className="size-4 accent-[var(--primary)]"
                              defaultChecked={assignment?.active ?? false}
                              name={`zoneActive:${zone.id}`}
                              type="checkbox"
                            />
                            <span className="truncate text-sm font-bold">
                              {zone.name}
                            </span>
                            <input
                              aria-label={`รหัส Zone ${zone.name}`}
                              className={`${compactInputClass} text-center font-mono`}
                              defaultValue={assignment?.code ?? ""}
                              maxLength={8}
                              name={`zoneCode:${zone.id}`}
                              placeholder="อัตโนมัติ"
                            />
                          </div>
                        );
                      })}
                      {!zones.length ? <EmptyMasterRow /> : null}
                      <button
                        className={`${compactPrimaryButtonClass} mt-1 justify-self-end`}
                        disabled={!zones.length}
                      >
                        <Save size={16} />
                        บันทึก Applicable Zones
                      </button>
                    </form>
                  </MasterPanel>
                </div>
              </section>
            ) : null}
            {canManageParts && plantConfig.inventoryCode ? (
              <section className="grid items-start gap-4 sm:grid-cols-2">
                <SparePartsMasterModal
                  eyebrow="Spare Parts"
                  icon={<Tags size={22} />}
                  subtitle="ดูสรุปรายการและมูลค่าแยกตามหมวดหมู่"
                  title="หมวดอะไหล่"
                >
                  <div className="flex min-h-[360px] flex-col">
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      สรุปรายการแยกตามหมวดที่ตั้งค่าไว้ด้านบน
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      {categoryRows.map((category, index) => (
                        <button
                          className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-3 text-left text-sm font-extrabold transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:bg-[var(--soft)] ${
                            index === 0
                              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                              : "border-[var(--line)] bg-[var(--card)]"
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
                      รวม {formatQuantity(spareParts.length)} รายการ
                      {canViewStockValue
                        ? ` · มูลค่าอะไหล่ ${formatMoney(totalPartValue)}`
                        : ""}
                    </p>
                  </div>
                </SparePartsMasterModal>

                <SparePartsMasterModal
                  eyebrow="Spare Parts"
                  icon={<CirclePlus size={22} />}
                  subtitle="กรอกข้อมูลอะไหล่ คลัง ประเภท และระดับ Stock"
                  title="เพิ่มอะไหล่"
                >
                  <form
                    action={addSparePart}
                    className="grid gap-4 lg:grid-cols-2"
                  >
                    <AdminScopeHiddenFields scope={scope} />
                    <label className={labelClass}>
                      ชนิดรายการ
                      <select
                        className={inputClass}
                        defaultValue="SPARE_PART"
                        name="itemKind"
                        required
                      >
                        <option value="SPARE_PART">อะไหล่</option>
                        <option value="CHEMICAL">สารเคมี</option>
                        <option value="OIL">น้ำมัน</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      ชื่ออะไหล่
                      <input
                        className={inputClass}
                        name="name"
                        placeholder="ระบุชื่ออะไหล่"
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      Item code ฝ่ายบัญชี
                      <input
                        className={inputClass}
                        maxLength={20}
                        name="itemCode"
                        placeholder="ระบุ Item code"
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      คลังอะไหล่
                      <select
                        className={inputClass}
                        name="defaultStoreId"
                        defaultValue=""
                        required
                      >
                        <option value="" disabled>
                          เลือกคลังอะไหล่
                        </option>
                        {activeStores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.code} · {store.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={labelClass}>
                      ประเภทอะไหล่ / ค่าใช้จ่าย
                      <select
                        className={inputClass}
                        name="typeId"
                        defaultValue=""
                        required
                      >
                        <option value="" disabled>
                          เลือกประเภท
                        </option>
                        {activePartTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.code} · {type.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <SparePartClassificationFields
                      categories={activePartCategories}
                      className={inputClass}
                      groups={activeMaterialGroups}
                    />
                    <label className={labelClass}>
                      หน่วยนับ
                      <input
                        className={inputClass}
                        name="unit"
                        placeholder="PCS, SET, M"
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      Stock ขั้นต่ำ
                      <input
                        className={inputClass}
                        min="0"
                        name="minStock"
                        step="0.01"
                        type="number"
                        defaultValue="0"
                      />
                    </label>
                    <label className={labelClass}>
                      Stock สูงสุด (Max)
                      <input
                        className={inputClass}
                        min="0"
                        name="maxStock"
                        step="0.01"
                        type="number"
                        placeholder="ไม่บังคับ"
                      />
                    </label>
                    <label className={labelClass}>
                      จุดสั่งซื้อ (Reorder Point)
                      <input
                        className={inputClass}
                        defaultValue="0"
                        min="0"
                        name="reorderPoint"
                        step="0.01"
                        type="number"
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      ราคาล่าสุด
                      <input
                        className={`${inputClass} ${canViewStockValue ? "" : "cursor-not-allowed bg-[var(--soft)] text-[var(--muted)]"}`}
                        disabled={!canViewStockValue}
                        min="0"
                        name="latestUnitPrice"
                        step="0.01"
                        type="number"
                        placeholder={
                          canViewStockValue
                            ? "ระบุราคาล่าสุด"
                            : "ไม่มีสิทธิ์ดูราคา"
                        }
                      />
                    </label>
                    <label className={`${labelClass} lg:col-span-2`}>
                      รายละเอียด
                      <textarea
                        className={`${inputClass} min-h-24 py-3`}
                        name="description"
                        placeholder="ระบุรายละเอียด (ไม่บังคับ)"
                      />
                    </label>
                    <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--line)] pt-4 lg:col-span-2">
                      <label className="mr-auto inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--soft)] px-4 text-sm font-bold">
                        <input
                          className="size-4 accent-[var(--primary)]"
                          defaultChecked
                          name="active"
                          type="checkbox"
                        />
                        เปิดใช้งาน
                      </label>
                      <button
                        className={secondaryButtonClass}
                        data-spare-parts-modal-close
                        type="reset"
                      >
                        <X size={17} />
                        ยกเลิก
                      </button>
                      <button className={primaryButtonClass}>
                        <Save size={17} />
                        บันทึกอะไหล่
                      </button>
                    </div>
                  </form>
                </SparePartsMasterModal>
              </section>
            ) : canManageParts || canManageStore ? (
              <section
                className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-300"
                id="spare-parts-master-data"
              >
                <p className="text-sm font-semibold">
                  กรุณาตั้งค่า Store Site Code 3 ตัวก่อนเพิ่มอะไหล่
                </p>
                <form
                  action={configureStoreCode}
                  className="mt-3 grid gap-3 sm:grid-cols-[minmax(150px,260px)_auto]"
                >
                  <AdminScopeHiddenFields scope={scope} />
                  <input
                    aria-label="Store Site Code"
                    className={inputClass}
                    maxLength={3}
                    minLength={3}
                    name="inventoryCode"
                    pattern="[A-Za-z0-9]{3}"
                    placeholder="Store Site Code เช่น RTB"
                    required
                  />
                  <button className={primaryButtonClass}>
                    บันทึก Site Code
                  </button>
                </form>
              </section>
            ) : null}
          </div>
        </details>
      ) : null}
    </>
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
    <SparePartsMasterModal icon={icon} subtitle={subtitle} title={title}>
      {children}
    </SparePartsMasterModal>
  );
}

function ActiveToggle({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--soft)] px-3 text-xs font-bold">
      <input
        className="size-4 accent-[var(--primary)]"
        defaultChecked={defaultChecked}
        name="active"
        type="checkbox"
      />
      ใช้งาน
    </label>
  );
}

function MasterRowActions({
  canEdit,
  deleteMessage,
}: {
  canEdit: boolean;
  deleteMessage: string;
}) {
  if (!canEdit) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white"
        title="บันทึก"
      >
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
  return (
    <p className="rounded-xl border border-dashed border-[var(--line)] p-3 text-sm text-[var(--muted)]">
      ยังไม่มีข้อมูล
    </p>
  );
}

const inputClass =
  "min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const secondaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--soft)] px-5 font-bold text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)]";
const compactPrimaryButtonClass =
  "inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--primary)] px-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]";
const compactInputClass =
  "min-h-10 min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--primary)]";
const masterRowBaseClass =
  "grid items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2";
const masterRowCompactClass = `${masterRowBaseClass} sm:grid-cols-[120px_minmax(160px,1fr)_auto_auto]`;
const masterRowWideClass = `${masterRowBaseClass} sm:grid-cols-[120px_minmax(130px,1fr)_minmax(130px,1fr)_auto_auto]`;
const labelClass = "grid gap-1.5 text-sm font-bold text-[var(--ink)]";
const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--primary-strong)]";

function formatMoney(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(value);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(value);
}
