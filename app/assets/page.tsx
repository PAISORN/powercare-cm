import Link from "next/link";
import { buildAssetHierarchy, assetLevelLabel } from "../../components/asset-hierarchy";
import { AssetTreeWorkspace, type AssetTreeItem } from "../../components/asset-tree-workspace";
import type { TreeAssetCreateState, TreeAssetLevel } from "../../components/asset-tree-create-drawer";
import type { TreeAssetDeleteState } from "../../components/asset-tree-delete-dialog";
import type { TreeAssetEditState } from "../../components/asset-tree-edit-drawer";
import { PreserveListPositionForm, PreserveListPositionLink, RestoreListPosition } from "../../components/preserve-list-position";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Boxes, CirclePlus, Download, FolderTree, Gauge, List, Search, Settings2, Upload, Wrench } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { AdminSiteScopeSelector } from "../../components/admin-site-scope-selector";
import { AutoSubmitSelect } from "../../components/auto-submit-select";
import { db } from "../../lib/db";
import { requireUser } from "../../lib/session";
import { verifyPassword } from "../../lib/password";
import { formatThaiDate } from "../../lib/date-time/bangkok-time";
import { canManageAssetMasters, canManageAssets, canRecodeAssets, canViewAssets } from "../../modules/auth/permission";
import { resolveAssetScope } from "../../modules/assets/asset-scope";
import { assetStatusLabel, createRegisteredAsset, criticalityLabel, updateRegisteredAsset } from "../../modules/assets/asset-service";
import { recordAudit } from "../../modules/audit/audit-service";

type Query = { organizationId?: string; plantId?: string; search?: string; assetClassId?: string; familyId?: string; zoneId?: string; status?: string; criticality?: string; systemId?: string; assetTypeId?: string; assetLevel?: string; discipline?: string; sort?: string; view?: string };

async function createTreeAsset(_previousState: TreeAssetCreateState, formData: FormData): Promise<TreeAssetCreateState> {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user)) return { status: "error", message: "ไม่มีสิทธิ์เพิ่ม Asset" };

  try {
    const scope = await resolveAssetScope(user, {
      organizationId: formText(formData, "organizationId"),
      plantId: formText(formData, "plantId"),
    });
    const sourceKind = formText(formData, "sourceKind");
    const sourceId = formText(formData, "sourceId");
    const assetLevel = formText(formData, "assetLevel") as TreeAssetLevel;
    let systemId = "";
    let parentId: string | null = null;
    let allowedLevels: TreeAssetLevel[] = [];

    if (sourceKind === "system") {
      const system = await db.assetSystem.findFirstOrThrow({ where: { id: sourceId, plantId: scope.plant.id, active: true }, select: { id: true } });
      systemId = system.id;
      allowedLevels = ["MAIN_ASSET", "SUB_ASSET", "PART"];
    } else if (sourceKind === "asset") {
      const parent = await db.asset.findFirstOrThrow({ where: { id: sourceId, plantId: scope.plant.id, registrationStatus: "ACTIVE", migrationStatus: "READY" }, select: { id: true, systemId: true, assetLevel: true } });
      if (!parent.systemId) throw new Error("Parent Asset ไม่มี System");
      systemId = parent.systemId;
      parentId = parent.id;
      allowedLevels = parent.assetLevel === "MAIN_ASSET" ? ["SUB_ASSET", "PART"] : parent.assetLevel === "SUB_ASSET" ? ["PART"] : [];
    } else {
      throw new Error("ตำแหน่งที่จะเพิ่ม Asset ไม่ถูกต้อง");
    }

    if (!allowedLevels.includes(assetLevel)) throw new Error("ระดับ Asset ไม่ตรงกับกิ่งที่เลือก");
    const asset = await createRegisteredAsset({
      plantId: scope.plant.id,
      code: formText(formData, "code"),
      systemId,
      parentId,
      assetLevel,
      assetTypeId: formText(formData, "assetTypeId"),
      zoneId: optionalFormText(formData, "zoneId"),
      nameTh: formText(formData, "nameTh"),
      discipline: optionalFormText(formData, "discipline"),
      manufacturer: optionalFormText(formData, "manufacturer"),
      model: optionalFormText(formData, "model"),
      serialNumber: optionalFormText(formData, "serialNumber"),
      keySpecification: optionalFormText(formData, "keySpecification"),
      operatingStatus: formText(formData, "operatingStatus"),
      criticality: formText(formData, "criticality"),
    });
    await recordAudit({ actorId: user.id, organizationId: scope.organization.id, plantId: scope.plant.id, entityType: "Asset", entityId: asset.id, action: "CREATE_ASSET", after: { code: asset.code, nameTh: asset.nameTh, assetLevel: asset.assetLevel, systemId: asset.systemId, parentId: asset.parentId, source: "TREE_DRAWER" } });
    revalidatePath("/assets");
    return { status: "success" };
  } catch (caught) {
    return { status: "error", message: caught instanceof Error ? caught.message : "สร้าง Asset ไม่สำเร็จ" };
  }
}

async function editTreeAsset(_previousState: TreeAssetEditState, formData: FormData): Promise<TreeAssetEditState> {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user)) return { status: "error", message: "ไม่มีสิทธิ์แก้ไข Asset" };

  try {
    const scope = await resolveAssetScope(user, {
      organizationId: formText(formData, "organizationId"),
      plantId: formText(formData, "plantId"),
    });
    const assetId = formText(formData, "assetId");
    const asset = await db.asset.findFirstOrThrow({ where: { id: assetId, plantId: scope.plant.id, registrationStatus: "ACTIVE" } });
    const submittedName = formText(formData, "name");
    const updated = await updateRegisteredAsset(asset.id, {
      plantId: asset.plantId,
      code: canRecodeAssets(user) ? formText(formData, "code") : asset.code,
      systemId: asset.systemId,
      assetTypeId: formText(formData, "assetTypeId"),
      assetLevel: asset.assetLevel,
      familyId: asset.familyId,
      assetClassId: asset.assetClassId,
      zoneId: optionalFormText(formData, "zoneId"),
      parentId: asset.parentId,
      componentCode: asset.componentCode,
      nameTh: asset.nameEn?.trim() ? asset.nameTh || submittedName : submittedName,
      nameEn: asset.nameEn?.trim() ? submittedName : null,
      discipline: optionalFormText(formData, "discipline"),
      tagKks: asset.tagKks,
      registrationCode: asset.registrationCode,
      keySpecification: optionalFormText(formData, "keySpecification"),
      metadataJson: asset.metadataJson,
      installationLocation: asset.installationLocation,
      manufacturer: optionalFormText(formData, "manufacturer"),
      model: optionalFormText(formData, "model"),
      serialNumber: optionalFormText(formData, "serialNumber"),
      installedAt: asset.installedAt,
      commissionedAt: asset.commissionedAt,
      operatingStatus: formText(formData, "operatingStatus"),
      criticality: formText(formData, "criticality"),
    });
    await recordAudit({
      actorId: user.id,
      organizationId: scope.organization.id,
      plantId: scope.plant.id,
      entityType: "Asset",
      entityId: asset.id,
      action: asset.code !== updated.code ? "RECODE_ASSET" : "UPDATE_ASSET",
      before: { code: asset.code, nameTh: asset.nameTh, nameEn: asset.nameEn, assetTypeId: asset.assetTypeId, zoneId: asset.zoneId, discipline: asset.discipline, criticality: asset.criticality, operatingStatus: asset.operatingStatus },
      after: { code: updated.code, nameTh: updated.nameTh, nameEn: updated.nameEn, assetTypeId: updated.assetTypeId, zoneId: updated.zoneId, discipline: updated.discipline, criticality: updated.criticality, operatingStatus: updated.operatingStatus, source: "TREE_DRAWER" },
    });
    revalidatePath("/assets");
    return { status: "success" };
  } catch (caught) {
    return { status: "error", message: caught instanceof Error ? caught.message : "แก้ไข Asset ไม่สำเร็จ" };
  }
}

async function deleteTreeAsset(_previousState: TreeAssetDeleteState, formData: FormData): Promise<TreeAssetDeleteState> {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user)) return { status: "error", message: "ไม่มีสิทธิ์ลบ Asset" };

  const password = String(formData.get("password") || "");
  if (!password) return { status: "error", message: "กรุณากรอกรหัสผ่าน" };

  try {
    const scope = await resolveAssetScope(user, {
      organizationId: formText(formData, "organizationId"),
      plantId: formText(formData, "plantId"),
    });
    const currentUser = await db.user.findFirst({ where: { id: user.id, active: true }, select: { passwordHash: true } });
    if (!currentUser || !(await verifyPassword(password, currentUser.passwordHash))) {
      return { status: "error", message: "รหัสผ่านไม่ถูกต้อง" };
    }

    const assetId = formText(formData, "assetId");
    const asset = await db.$transaction(async tx => {
      const current = await tx.asset.findFirstOrThrow({
        where: { id: assetId, plantId: scope.plant.id, registrationStatus: "ACTIVE" },
        select: { id: true, code: true, nameTh: true, assetLevel: true, systemId: true, parentId: true },
      });
      const activeChildren = await tx.asset.count({ where: { parentId: current.id, plantId: scope.plant.id, registrationStatus: "ACTIVE" } });
      if (activeChildren) throw new Error(`ไม่สามารถลบ ${current.code || current.nameTh} ได้ เนื่องจากยังมี Asset ย่อย ${activeChildren} รายการ`);
      const result = await tx.asset.updateMany({
        where: { id: current.id, plantId: scope.plant.id, registrationStatus: "ACTIVE" },
        data: { registrationStatus: "CANCELED", operatingStatus: "RETIRED", cancellationReason: "ลบผ่าน Tree Assets" },
      });
      if (result.count !== 1) throw new Error("Asset ถูกแก้ไขโดยผู้ใช้อื่น กรุณาลองใหม่");
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          organizationId: scope.organization.id,
          plantId: scope.plant.id,
          entityType: "Asset",
          entityId: current.id,
          action: "DELETE_ASSET",
          beforeJson: JSON.stringify({ code: current.code, nameTh: current.nameTh, assetLevel: current.assetLevel, systemId: current.systemId, parentId: current.parentId, registrationStatus: "ACTIVE" }),
          afterJson: JSON.stringify({ registrationStatus: "CANCELED", operatingStatus: "RETIRED", source: "TREE_DIALOG" }),
        },
      });
      return current;
    });
    revalidatePath("/assets");
    return { status: "success" };
  } catch (caught) {
    return { status: "error", message: caught instanceof Error ? caught.message : "ลบ Asset ไม่สำเร็จ" };
  }
}

function formText(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function optionalFormText(formData: FormData, key: string) { return formText(formData, key) || null; }

export default async function AssetsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser();
  if (!canViewAssets(user)) redirect("/dashboardcm");
  const query = await searchParams;
  const scope = await resolveAssetScope(user, query);
  const hierarchy = query.view !== "list";
  const where = {
    plantId: scope.plant.id,
    registrationStatus: "ACTIVE",
    ...(query.systemId ? { systemId: query.systemId } : {}),
    ...(query.assetTypeId ? { assetTypeId: query.assetTypeId } : {}),
    ...(query.assetLevel ? { assetLevel: query.assetLevel } : {}),
    ...(query.discipline ? { discipline: query.discipline } : {}),
    ...(query.assetClassId ? { assetClassId: query.assetClassId } : {}),
    ...(query.familyId ? { familyId: query.familyId } : {}),
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.status ? { operatingStatus: query.status } : {}),
    ...(query.criticality ? { criticality: query.criticality } : {}),
    ...(query.search ? { OR: [
      { code: { contains: query.search } }, { nameTh: { contains: query.search } }, { nameEn: { contains: query.search } },
      { tagKks: { contains: query.search } }, { serialNumber: { contains: query.search } }, { manufacturer: { contains: query.search } }, { model: { contains: query.search } },
    ] } : {}),
  };
  const filteredTotal = await db.asset.count({ where });
  const [assets, assetClasses, families, zones, total, underRepair, critical, systems, types, treeAssets] = await Promise.all([
    db.asset.findMany({ where, include: { family: true, assetType: true, zone: true, system: true, cmWorks: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, closedAt: true } }, pmWorks: { orderBy: { updatedAt: "desc" }, take: 1, select: { status: true } } }, orderBy: query.sort === "name" ? [{ nameTh: "asc" }, { code: "asc" }] : [{ code: query.sort === "codeDesc" ? "desc" : "asc" }] }),
    db.assetClass.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: [{ nameTh: "asc" }, { nameEn: "asc" }] }),
    db.assetFamily.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { code: "asc" } }),
    db.zone.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { name: "asc" } }),
    db.asset.count({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE" } }),
    db.asset.count({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE", operatingStatus: "UNDER_REPAIR" } }),
    db.asset.count({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE", criticality: "CRITICAL" } }),
    db.assetSystem.findMany({ where: { plantId: scope.plant.id }, orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
    db.assetType.findMany({ where: { plantId: scope.plant.id, active: true }, orderBy: { nameTh: "asc" } }),
    hierarchy ? db.asset.findMany({ where: { plantId: scope.plant.id, registrationStatus: "ACTIVE" }, include: { family: true, assetType: true, zone: true, system: true, cmWorks: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, closedAt: true } }, pmWorks: { orderBy: { updatedAt: "desc" }, take: 1, select: { status: true } } }, orderBy: query.sort === "name" ? [{ nameTh: "asc" }, { code: "asc" }] : [{ code: query.sort === "codeDesc" ? "desc" : "asc" }] }) : Promise.resolve([]),
  ]);
  const shown = assets;
  const tree = buildAssetHierarchy(treeAssets, new Set(assets.map(asset => asset.id)), new Set(systems.map(system => system.id)));
  const listUrl = assetsUrl({ ...query, organizationId: scope.organization.id, plantId: scope.plant.id });
  const treeAssetsById = new Map(treeAssets.map(asset => [asset.id, asset]));
  function toTreeItem(branch: typeof tree.roots[number]): AssetTreeItem {
    const asset = branch.asset;
    const parent = asset.parentId ? treeAssetsById.get(asset.parentId) : null;
    const grandParent = parent?.parentId ? treeAssetsById.get(parent.parentId) : null;
    const mainAsset = asset.assetLevel === "MAIN_ASSET" ? asset : asset.assetLevel === "SUB_ASSET" ? parent : parent?.assetLevel === "MAIN_ASSET" ? parent : parent?.assetLevel === "SUB_ASSET" ? grandParent : null;
    const subAsset = asset.assetLevel === "SUB_ASSET" ? asset : asset.assetLevel === "PART" && parent?.assetLevel === "SUB_ASSET" ? parent : null;
    const partAsset = asset.assetLevel === "PART" ? asset : null;
    const r8Level = asset.assetLevel === "MAIN_ASSET" ? "Main Asset" : asset.assetLevel === "SUB_ASSET" ? "Sub-Asset" : "Part-Asset";
    const text = (value: string | null | undefined) => value?.trim() || "";
    return {
      id: asset.id,
      systemId: asset.systemId || "",
      systemName: text(asset.system?.nameTh) || text(asset.system?.nameEn) || "ไม่ระบุ System",
      assetLevel: asset.assetLevel as TreeAssetLevel,
      code: text(asset.code) || "ยังไม่ระบุรหัส",
      name: text(asset.nameEn) || text(asset.nameTh) || "ยังไม่ระบุชื่อ",
      levelLabel: r8Level,
      areaZone: text(asset.zone?.name),
      assetType: text(asset.assetType?.nameTh) || text(asset.assetType?.nameEn),
      cmStatus: asset.cmWorks[0]?.status || null,
      cmStatusDetail: asset.cmWorks[0]?.closedAt ? formatThaiDate(asset.cmWorks[0].closedAt) : null,
      pmStatus: asset.pmWorks[0]?.status || null,
      statusLabel: assetStatusLabel(asset.operatingStatus),
      criticalityLabel: criticalityLabel(asset.criticality),
      contextOnly: branch.contextOnly,
      imageUrl: asset.imageStoragePath ? `/asset-images/${asset.id}` : null,
      detailHref: `/assets/${asset.id}?returnTo=${encodeURIComponent(listUrl)}`,
      editData: {
        assetTypeId: asset.assetTypeId || "",
        zoneId: asset.zoneId || "",
        discipline: text(asset.discipline),
        criticality: asset.criticality,
        manufacturer: text(asset.manufacturer),
        model: text(asset.model),
        serialNumber: text(asset.serialNumber),
        operatingStatus: asset.operatingStatus,
        keySpecification: text(asset.keySpecification),
      },
      details: [
        { label: "SYSTEM", value: text(asset.system?.nameTh) || text(asset.system?.nameEn) },
        { label: "MAIN ASSET", value: text(mainAsset?.nameEn) || text(mainAsset?.nameTh) },
        { label: "SUB-ASSET", value: text(subAsset?.nameEn) || text(subAsset?.nameTh) },
        { label: "PART-ASSET", value: text(partAsset?.nameEn) || text(partAsset?.nameTh) },
        { label: "CODE ASSET", value: text(asset.code) },
        { label: "ASSET LEVEL", value: r8Level },
        { label: "AREA / ZONE", value: text(asset.zone?.name) },
        { label: "ASSET TYPE", value: text(asset.assetType?.nameTh) || text(asset.assetType?.nameEn) },
        { label: "DISCIPLINE", value: text(asset.discipline) },
        { label: "CRITICALITY", value: criticalityLabel(asset.criticality) },
        { label: "MANUFACTURER", value: text(asset.manufacturer) },
        { label: "MODEL / TYPE", value: text(asset.model) },
        { label: "SERIAL NO.", value: text(asset.serialNumber) },
        { label: "STATUS", value: assetStatusLabel(asset.operatingStatus) },
        { label: "KEY SPECIFICATION", value: text(asset.keySpecification) },
      ],
      children: branch.children.map(toTreeItem),
    };
  }
  const treeSystems = systems.map(system => ({
    id: system.id,
    code: system.code,
    name: system.nameTh || system.nameEn || system.code,
    branches: tree.roots.filter(root => root.asset.systemId === system.id).map(toTreeItem),
  })).filter(system => system.branches.length);
  const reviewItems = tree.review.map(asset => toTreeItem({ asset, contextOnly: false, children: [] }));
  return <AppShell>
    <RestoreListPosition storageKey="assets" enabled/>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold uppercase tracking-[.18em] text-emerald-600">Asset registry</p><h1 className="mt-2 text-3xl font-black">ทะเบียนเครื่องจักรและอุปกรณ์</h1><p className="mt-2 text-sm text-[var(--muted)]">ข้อมูลกลางสำหรับเชื่อม Corrective และ Preventive Maintenance</p></div>
      <div className="flex flex-wrap gap-2"><a href={`/assets/export?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={secondaryButton}><Download size={17}/>Export Excel</a>{canManageAssets(user)?<Link href={`/assets/import?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={secondaryButton}><Upload size={17}/>Import Excel</Link>:null}{canManageAssetMasters(user) ? <Link href={`/assets/master-data?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={secondaryButton}><Settings2 size={17}/>Master Data</Link> : null}{canManageAssets(user) ? <Link href={`/assets/new?organizationId=${scope.organization.id}&plantId=${scope.plant.id}`} className={primaryButton}><CirclePlus size={17}/>สร้าง Asset</Link> : null}</div>
    </header>
    {scope.canSelectPlant || scope.canSelectOrganization ? <div className="mt-6"><AdminSiteScopeSelector scope={scope} title="Asset scope" description="ข้อมูลทะเบียนถูกแยกตาม Site" /></div> : null}
    <section className="mt-6 grid gap-3 sm:grid-cols-3">
      <Kpi icon={Boxes} label="Assets ทั้งหมด" value={total} tone="emerald"/><Kpi icon={Wrench} label="ปิดซ่อม" value={underRepair} tone="amber"/><Kpi icon={Gauge} label="Critical" value={critical} tone="red"/>
    </section>
    <PreserveListPositionForm className="mt-5 grid gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4" id="asset-filters" storageKey="assets" targetId="asset-filters">
      <input type="hidden" name="organizationId" value={scope.organization.id}/><input type="hidden" name="plantId" value={scope.plant.id}/><input type="hidden" name="view" value={query.view || "tree"}/>
      <label className="relative"><Search className="absolute left-3 top-3.5 text-[var(--muted)]" size={17}/><input aria-label="ค้นหา Asset" name="search" defaultValue={query.search} className={`${inputClass} w-full pl-10`} placeholder="ค้นหารหัส ชื่อ Tag/KKS Serial ผู้ผลิต รุ่น"/></label>
      <AutoSubmitSelect aria-label="System" name="systemId" defaultValue={query.systemId} className={inputClass}><option value="">ทุก System</option>{systems.map(x => <option key={x.id} value={x.id}>{x.code} · {x.nameEn || x.nameTh}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset Type" name="assetTypeId" defaultValue={query.assetTypeId} className={inputClass}><option value="">ทุก Asset Type</option>{types.map(x => <option key={x.id} value={x.id}>{x.nameEn || x.nameTh}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset Level" name="assetLevel" defaultValue={query.assetLevel} className={inputClass}><option value="">ทุกระดับ</option>{["MAIN_ASSET","SUB_ASSET","PART"].map(x => <option key={x} value={x}>{assetLevelLabel(x)}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Discipline" name="discipline" defaultValue={query.discipline} className={inputClass}><option value="">ทุก Discipline</option>{["Mechanical","Electrical","Instrument","Control"].map(x => <option key={x}>{x}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="เรียงลำดับ" name="sort" defaultValue={query.sort} className={inputClass}><option value="">รหัส น้อยไปมาก</option><option value="codeDesc">รหัส มากไปน้อย</option><option value="name">ชื่อ</option></AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset Class" name="assetClassId" defaultValue={query.assetClassId} className={inputClass}><option value="">ทุก Asset Class</option>{assetClasses.map(x => <option key={x.id} value={x.id}>{x.nameEn || x.nameTh}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset Families" name="familyId" defaultValue={query.familyId} className={inputClass}><option value="">ทุก Asset Families</option>{families.map(x => <option key={x.id} value={x.id}>{x.code} · {x.nameEn || x.nameTh || "ไม่ระบุชื่อ"}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Zone" name="zoneId" defaultValue={query.zoneId} className={inputClass}><option value="">ทุก Area / Zone</option>{zones.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Asset status" name="status" defaultValue={query.status} className={inputClass}><option value="">ทุกสถานะ</option>{["IN_SERVICE","UNDER_REPAIR","STANDBY","TEMPORARILY_OUT","RETIRED"].map(x => <option key={x} value={x}>{assetStatusLabel(x)}</option>)}</AutoSubmitSelect>
      <AutoSubmitSelect aria-label="Criticality" name="criticality" defaultValue={query.criticality} className={inputClass}><option value="">ทุก Criticality</option>{["CRITICAL","HIGH","MEDIUM","LOW"].map(x => <option key={x}>{x}</option>)}</AutoSubmitSelect>
      <button className={primaryButton}>ค้นหา</button>
    </PreserveListPositionForm>
    <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm text-[var(--muted)]">พบ {filteredTotal} รายการ</p><div aria-label="เลือกรูปแบบการแสดง Assets" id="asset-view-toggle" className="flex items-center rounded-full bg-[#4c437e] p-1.5 shadow-[inset_0_1px_3px_rgb(13_27_61_/_28%),0_5px_14px_rgb(13_27_61_/_16%)]" role="group"><ViewLink active={!hierarchy} href={viewUrl(query, "list")} icon={List} label="รายการ"/><ViewLink active={hierarchy} href={viewUrl(query, "tree")} icon={FolderTree} label="โครงสร้าง"/></div></div>
    {hierarchy ? <div className="mt-3"><AssetTreeWorkspace canCreateAssets={canManageAssets(user)} canRecodeAssets={canRecodeAssets(user)} createAction={createTreeAsset} editAction={editTreeAsset} deleteAction={deleteTreeAsset} createOptions={{ organizationId: scope.organization.id, plantId: scope.plant.id, assetTypes: types.map(type => ({ id: type.id, code: type.code, name: type.nameTh || type.nameEn || type.code, discipline: type.discipline })), zones: zones.map(zone => ({ id: zone.id, name: zone.name })) }} siteCode={scope.plant.code} systems={treeSystems} review={reviewItems}/></div> : <section className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="overflow-x-auto">
        <div className={`${listGrid} sticky top-0 z-20 border-b border-slate-300 bg-slate-100 px-5 py-3.5 text-xs font-black uppercase tracking-[.08em] text-slate-700`} role="row"><span role="columnheader">Assets</span><span role="columnheader">CODE ASSET</span><span role="columnheader">ASSET LEVEL</span><span role="columnheader">AREA / ZONE</span><span role="columnheader">สถานะ PM / CM</span><span role="columnheader">ASSET TYPE</span></div>
        {shown.map(asset => <AssetRow key={asset.id} asset={asset} listUrl={listUrl}/>)}
        {!shown.length ? <div className="min-w-[1120px] px-5 py-16 text-center"><Boxes className="mx-auto text-[var(--muted)]"/><h2 className="mt-3 font-bold">ยังไม่พบ Asset</h2><p className="mt-1 text-sm text-[var(--muted)]">ลองเปลี่ยนตัวกรองหรือสร้าง Asset รายการแรก</p></div> : null}
      </div>
    </section>}
  </AppShell>;
}

const listGrid = "grid min-w-[1120px] grid-cols-[minmax(300px,2.1fr)_minmax(150px,0.9fr)_minmax(130px,0.75fr)_minmax(150px,0.9fr)_minmax(190px,1.15fr)_minmax(160px,1fr)] gap-3";
const inputClass = "min-h-11 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 text-sm outline-none focus:border-emerald-500";
const primaryButton = "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
const secondaryButton = "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold transition hover:bg-[var(--soft)]";
function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Boxes; label: string; value: number; tone: "emerald"|"amber"|"red" }) { const tones={emerald:"bg-emerald-500/10 text-emerald-600",amber:"bg-amber-500/10 text-amber-600",red:"bg-red-500/10 text-red-600"}; return <div className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"><span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}><Icon size={21}/></span><div><p className="text-sm text-[var(--muted)]">{label}</p><p className="text-2xl font-black">{value}</p></div></div>; }
function ViewLink({ active, href, icon: Icon, label }: { active: boolean; href: string; icon: typeof List; label: string }) { return <Link aria-current={active ? "page" : undefined} aria-label={label} href={href} scroll={false} className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full text-sm font-black outline-none transition-[width,background-color,color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4c437e] ${active ? "w-36 bg-white text-[#4c437e] shadow-sm" : "w-12 text-white hover:bg-white/10"}`}><Icon aria-hidden="true" size={18}/><span className={active ? "whitespace-nowrap" : "sr-only"}>{label}</span></Link>; }
function AssetRow({ asset, contextOnly=false, listUrl }: { asset: any; contextOnly?: boolean; listUrl: string }) {
  const level = assetLevelLabel(asset.assetLevel);
  const assetType = asset.assetType?.nameTh || asset.assetType?.nameEn || "ยังไม่ระบุ";
  return <div id={`asset-row-${asset.id}`} className="border-b border-[var(--line)] last:border-0"><PreserveListPositionLink storageKey="assets" targetId={`asset-row-${asset.id}`} href={`/assets/${asset.id}?returnTo=${encodeURIComponent(`${listUrl}#asset-row-${asset.id}`)}`} className={`${listGrid} min-h-[76px] items-center px-5 py-3 transition hover:bg-[var(--soft)]`}>
    <div className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--soft)] text-emerald-600">{asset.imageStoragePath?<img src={`/asset-images/${asset.id}`} alt={`รูป ${asset.nameEn||asset.nameTh}`} loading="lazy" className="h-full w-full object-cover"/>:<Boxes aria-hidden="true" size={25}/>}</span><span className="min-w-0"><span className="block truncate font-bold">{asset.nameEn||asset.nameTh}</span><span className="mt-1 block truncate text-xs text-[var(--muted)]">{assetStatusLabel(asset.operatingStatus)} · {criticalityLabel(asset.criticality)}{asset.tagKks ? ` · ${asset.tagKks}` : ""}</span>{contextOnly?<span className="mt-1 block text-xs font-semibold text-amber-700 dark:text-amber-400">ลำดับแม่ · ไม่ตรงตัวกรอง</span>:null}</span></div>
    <span className="truncate font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">{asset.code}</span>
    <span className="w-fit rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">{level}</span>
    <span className="truncate text-sm font-semibold">{asset.zone?.name || "ยังไม่ระบุ"}</span>
    <ListMaintenanceStatus cmStatus={asset.cmWorks[0]?.status || null} cmDetail={asset.cmWorks[0]?.closedAt ? formatThaiDate(asset.cmWorks[0].closedAt) : null} pmStatus={asset.pmWorks[0]?.status || null}/>
    <span className="truncate text-sm font-semibold" title={assetType}>{assetType}</span>
  </PreserveListPositionLink></div>;
}
function ListMaintenanceStatus({ cmStatus, cmDetail, pmStatus }: { cmStatus: string | null; cmDetail: string | null; pmStatus: string | null }) { return <div className="grid gap-1"><ListStatusPill kind="CM" status={cmStatus} detail={cmDetail}/><ListStatusPill kind="PM" status={pmStatus}/></div>; }
function ListStatusPill({ kind, status, detail }: { kind: "CM" | "PM"; status: string | null; detail?: string | null }) { const label = kind === "CM" ? listCmStatusLabel(status) : listPmStatusLabel(status); return <span className={`w-fit max-w-full truncate rounded-full px-2 py-1 text-[10px] font-bold ${listWorkStatusTone(status)}`} title={`${kind}: ${label}${detail ? ` · ${detail}` : ""}`}>{kind}: {label}{detail ? ` · ${detail}` : ""}</span>; }
function listCmStatusLabel(status: string | null) { return ({ NEW: "แจ้งใหม่", WAITING_TO_CLAIM: "รอรับงาน", CLAIMED: "รับเรื่องแล้ว", IN_PROGRESS: "กำลังดำเนินการ", BACKLOG_SHUTDOWN: "Backlog Shutdown", WAITING_TO_CLOSE: "รอปิดงาน", RETURNED_FOR_CORRECTION: "ส่งกลับแก้ไข", CLOSED: "ปิดงานแล้ว", CANCELED: "ยกเลิก" } as Record<string,string>)[status || ""] || "ยังไม่มี"; }
function listPmStatusLabel(status: string | null) { return ({ PLANNED: "วางแผนแล้ว", IN_PROGRESS: "กำลังดำเนินการ", COMPLETED: "เสร็จแล้ว", CANCELED: "ยกเลิก" } as Record<string,string>)[status || ""] || "ยังไม่มี"; }
function listWorkStatusTone(status: string | null) { if (["CLOSED","COMPLETED"].includes(status || "")) return "bg-emerald-100 text-emerald-700"; if (["IN_PROGRESS","CLAIMED","WAITING_TO_CLOSE"].includes(status || "")) return "bg-blue-100 text-blue-700"; if (["PLANNED","NEW","WAITING_TO_CLAIM"].includes(status || "")) return "bg-violet-100 text-violet-700"; if (["BACKLOG_SHUTDOWN","RETURNED_FOR_CORRECTION"].includes(status || "")) return "bg-amber-100 text-amber-700"; if (status === "CANCELED") return "bg-rose-100 text-rose-700"; return "bg-slate-100 text-slate-500"; }
function assetsUrl(query: Query) { const p = new URLSearchParams(Object.entries(query).filter(([,v]) => v) as [string,string][]); return `/assets?${p}`; }
function viewUrl(query: Query, view: string) { const p = new URLSearchParams(Object.entries({ ...query, view }).filter(([,v]) => v) as [string,string][]); return `/assets?${p}`; }
