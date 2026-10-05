import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Boxes,
  CirclePlus,
  Download,
  FolderTree,
  Gauge,
  List,
  Search,
  Settings2,
  Upload,
  Wrench,
} from "lucide-react";
import { AdminSiteScopeSelector } from "./admin-site-scope-selector";
import { assetLevelLabel } from "./asset-hierarchy";
import { AssetListTable } from "./asset-list-table";
import { AssetTreeWorkspace } from "./asset-tree-workspace";
import { AutoSubmitSelect } from "./auto-submit-select";
import {
  PreserveListPositionForm,
  RestoreListPosition,
} from "./preserve-list-position";
import { resolveAssetScope } from "../modules/assets/asset-scope";
import type { AssetListPageData } from "../modules/assets/asset-list-page-data";
import type { AssetListPageModel } from "../modules/assets/asset-list-page-model";
import {
  assetViewUrl,
  isAssetHierarchyView,
  type AssetListQuery,
} from "../modules/assets/asset-list-query";
import { assetStatusLabel } from "../modules/assets/asset-service";
import {
  createTreeAsset,
  deleteTreeAsset,
  editTreeAsset,
} from "../app/assets/actions";
export function AssetRegistryPage({
  query,
  scope,
  data,
  model,
  permissions,
}: {
  query: AssetListQuery;
  scope: Awaited<ReturnType<typeof resolveAssetScope>>;
  data: AssetListPageData;
  model: AssetListPageModel;
  permissions: {
    canManageAssets: boolean;
    canManageAssetMasters: boolean;
    canRecodeAssets: boolean;
  };
}) {
  const {
    assets: shown,
    assetClasses,
    families,
    zones,
    total,
    underRepair,
    critical,
    systems,
    types,
    filteredTotal,
  } = data;
  const { listUrl, treeSystems, reviewItems } = model;
  const hierarchy = isAssetHierarchyView(query);
  return (
    <>
      <RestoreListPosition storageKey="assets" enabled />
      {scope.canSelectPlant || scope.canSelectOrganization ? (
        <div className="mb-6">
          <AdminSiteScopeSelector
            scope={scope}
            title="Asset scope"
            description="ข้อมูลทะเบียนถูกแยกตาม Site"
          />
        </div>
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">
            Asset registry
          </p>
          <h1 className="mt-2 text-3xl font-black">
            ทะเบียนเครื่องจักรและอุปกรณ์
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            ข้อมูลกลางสำหรับเชื่อม Corrective และ Preventive Maintenance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/assets/export?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`}
            className={secondaryButton}
          >
            <Download size={17} />
            Export Excel
          </a>
          {permissions.canManageAssets ? (
            <Link
              href={`/assets/import?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`}
              className={secondaryButton}
            >
              <Upload size={17} />
              Import Excel
            </Link>
          ) : null}
          {permissions.canManageAssetMasters ? (
            <Link
              href={`/assets/master-data?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`}
              className={secondaryButton}
            >
              <Settings2 size={17} />
              Master Data
            </Link>
          ) : null}
          {permissions.canManageAssets ? (
            <Link
              href={`/assets/new?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`}
              className={primaryButton}
            >
              <CirclePlus size={17} />
              สร้าง Asset
            </Link>
          ) : null}
        </div>
      </header>
      <section className="dashboard-kpi-carousel mt-6 sm:grid-cols-3" aria-label="Asset KPI strip">
        <Kpi icon={Boxes} label="Assets ทั้งหมด" value={total} tone="emerald" />
        <Kpi icon={Wrench} label="ปิดซ่อม" value={underRepair} tone="amber" />
        <Kpi icon={Gauge} label="Critical" value={critical} tone="red" />
      </section>
      <PreserveListPositionForm
        className="mt-5 grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4"
        id="asset-filters"
        storageKey="assets"
        targetId="asset-filters"
      >
        <input
          type="hidden"
          name="organizationId"
          value={scope.organization.id}
        />
        <input type="hidden" name="plantId" value={scope.plant.id} />
        <input type="hidden" name="view" value={query.view || "tree"} />
        <label className="relative">
          <Search
            className="absolute left-3 top-3.5 text-[var(--muted)]"
            size={17}
          />
          <input
            aria-label="ค้นหา Asset"
            name="search"
            defaultValue={query.search}
            className={`${inputClass} w-full pl-10`}
            placeholder="ค้นหารหัส ชื่อ Tag/KKS Serial ผู้ผลิต รุ่น"
          />
        </label>
        <AutoSubmitSelect
          aria-label="System"
          name="systemId"
          defaultValue={query.systemId}
          className={inputClass}
        >
          <option value="">ทุก System</option>
          {systems.map((x) => (
            <option key={x.id} value={x.id}>
              {x.code} · {x.nameEn || x.nameTh}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          aria-label="Asset Type"
          name="assetTypeId"
          defaultValue={query.assetTypeId}
          className={inputClass}
        >
          <option value="">ทุก Asset Type</option>
          {types.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nameEn || x.nameTh}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          aria-label="Asset Level"
          name="assetLevel"
          defaultValue={query.assetLevel}
          className={inputClass}
        >
          <option value="">ทุกระดับ</option>
          {["MAIN_ASSET", "SUB_ASSET", "PART"].map((x) => (
            <option key={x} value={x}>
              {assetLevelLabel(x)}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          aria-label="Discipline"
          name="discipline"
          defaultValue={query.discipline}
          className={inputClass}
        >
          <option value="">ทุก Discipline</option>
          {["Mechanical", "Electrical", "Instrument", "Control"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          aria-label="เรียงลำดับ"
          name="sort"
          defaultValue={query.sort}
          className={inputClass}
        >
          <option value="">รหัส น้อยไปมาก</option>
          <option value="codeDesc">รหัส มากไปน้อย</option>
          <option value="name">ชื่อ</option>
        </AutoSubmitSelect>
        <AutoSubmitSelect
          aria-label="Asset Class"
          name="assetClassId"
          defaultValue={query.assetClassId}
          className={inputClass}
        >
          <option value="">ทุก Asset Class</option>
          {assetClasses.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nameEn || x.nameTh}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          aria-label="Asset Families"
          name="familyId"
          defaultValue={query.familyId}
          className={inputClass}
        >
          <option value="">ทุก Asset Families</option>
          {families.map((x) => (
            <option key={x.id} value={x.id}>
              {x.code} · {x.nameEn || x.nameTh || "ไม่ระบุชื่อ"}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          aria-label="Zone"
          name="zoneId"
          defaultValue={query.zoneId}
          className={inputClass}
        >
          <option value="">ทุก Area / Zone</option>
          {zones.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          aria-label="Asset status"
          name="status"
          defaultValue={query.status}
          className={inputClass}
        >
          <option value="">ทุกสถานะ</option>
          {[
            "IN_SERVICE",
            "UNDER_REPAIR",
            "STANDBY",
            "TEMPORARILY_OUT",
            "RETIRED",
          ].map((x) => (
            <option key={x} value={x}>
              {assetStatusLabel(x)}
            </option>
          ))}
        </AutoSubmitSelect>
        <AutoSubmitSelect
          aria-label="Criticality"
          name="criticality"
          defaultValue={query.criticality}
          className={inputClass}
        >
          <option value="">ทุก Criticality</option>
          {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </AutoSubmitSelect>
        <button className={primaryButton}>ค้นหา</button>
      </PreserveListPositionForm>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">พบ {filteredTotal} รายการ</p>
        <div
          aria-label="เลือกรูปแบบการแสดง Assets"
          id="asset-view-toggle"
          className="flex items-center rounded-full bg-[#4c437e] p-1.5 shadow-[inset_0_1px_3px_rgb(13_27_61_/_28%),0_5px_14px_rgb(13_27_61_/_16%)]"
          role="group"
        >
          <ViewLink
            active={!hierarchy}
            href={assetViewUrl(query, "list")}
            icon={List}
            label="รายการ"
          />
          <ViewLink
            active={hierarchy}
            href={assetViewUrl(query, "tree")}
            icon={FolderTree}
            label="โครงสร้าง"
          />
        </div>
      </div>
      {hierarchy ? (
        <div className="mt-3">
          <AssetTreeWorkspace
            canCreateAssets={permissions.canManageAssets}
            canRecodeAssets={permissions.canRecodeAssets}
            createAction={createTreeAsset}
            editAction={editTreeAsset}
            deleteAction={deleteTreeAsset}
            createOptions={{
              organizationId: scope.organization.id,
              plantId: scope.plant.id,
              assetTypes: types.map((type) => ({
                id: type.id,
                code: type.code,
                name: type.nameTh || type.nameEn || type.code,
                discipline: type.discipline,
              })),
              zones: zones.map((zone) => ({ id: zone.id, name: zone.name })),
            }}
            siteCode={scope.plant.code}
            systems={treeSystems}
            review={reviewItems}
          />
        </div>
      ) : (
        <AssetListTable assets={shown} listUrl={listUrl} />
      )}
    </>
  );
}
const inputClass =
  "min-h-11 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500";
const primaryButton =
  "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
const secondaryButton =
  "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold transition hover:bg-[var(--soft)]";
function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
  tone: "emerald" | "amber" | "red";
}) {
  const tones = {
    emerald: "#10b981",
    amber: "#f59e0b",
    red: "#ef4444",
  };
  return (
    <div
      className="dashboard-kpi dashboard-kpi-glow dashboard-kpi-slide relative flex min-h-[148px] items-center gap-4 overflow-hidden rounded-2xl border p-4"
      style={{ "--kpi-color": tones[tone] } as CSSProperties}
    >
      <span className="dashboard-kpi-icon shrink-0">
        <Icon size={21} />
      </span>
      <div>
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  );
}
function ViewLink({
  active,
  href,
  icon: Icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: typeof List;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={label}
      href={href}
      scroll={false}
      className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full text-sm font-black outline-none transition-[width,background-color,color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4c437e] ${active ? "w-36 bg-white text-[#4c437e] shadow-sm" : "w-12 text-white hover:bg-white/10"}`}
    >
      <Icon aria-hidden="true" size={18} />
      <span className={active ? "whitespace-nowrap" : "sr-only"}>{label}</span>
    </Link>
  );
}
