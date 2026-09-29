import {
  buildAssetHierarchy,
  type AssetBranch,
} from "../../components/asset-hierarchy";
import type {
  AssetTreeItem,
  AssetTreeSystem,
} from "../../components/asset-tree-workspace";
import type { TreeAssetLevel } from "../../components/asset-tree-create-drawer";
import { formatThaiDate } from "../../lib/date-time/bangkok-time";
import { assetStatusLabel, criticalityLabel } from "./asset-service";
import { assetsUrl, type AssetListQuery } from "./asset-list-query";
import type { AssetListPageData } from "./asset-list-page-data";

type TreeAsset = AssetListPageData["treeAssets"][number];

export function buildAssetListPageModel(
  data: AssetListPageData,
  query: AssetListQuery,
  scope: { organizationId: string; plantId: string },
) {
  const listUrl = assetsUrl({
    ...query,
    organizationId: scope.organizationId,
    plantId: scope.plantId,
  });
  const tree = buildAssetHierarchy(
    data.treeAssets,
    new Set(data.assets.map((asset) => asset.id)),
    new Set(data.systems.map((system) => system.id)),
  );
  const treeAssetsById = new Map(
    data.treeAssets.map((asset) => [asset.id, asset]),
  );

  function toTreeItem(branch: AssetBranch<TreeAsset>): AssetTreeItem {
    const asset = branch.asset;
    const parent = asset.parentId ? treeAssetsById.get(asset.parentId) : null;
    const grandParent = parent?.parentId
      ? treeAssetsById.get(parent.parentId)
      : null;
    const mainAsset =
      asset.assetLevel === "MAIN_ASSET"
        ? asset
        : asset.assetLevel === "SUB_ASSET"
          ? parent
          : parent?.assetLevel === "MAIN_ASSET"
            ? parent
            : parent?.assetLevel === "SUB_ASSET"
              ? grandParent
              : null;
    const subAsset =
      asset.assetLevel === "SUB_ASSET"
        ? asset
        : asset.assetLevel === "PART" && parent?.assetLevel === "SUB_ASSET"
          ? parent
          : null;
    const partAsset = asset.assetLevel === "PART" ? asset : null;
    const levelLabel =
      asset.assetLevel === "MAIN_ASSET"
        ? "Main Asset"
        : asset.assetLevel === "SUB_ASSET"
          ? "Sub-Asset"
          : "Part-Asset";
    const text = (value: string | null | undefined) => value?.trim() || "";

    return {
      id: asset.id,
      systemId: asset.systemId || "",
      systemName:
        text(asset.system?.nameTh) ||
        text(asset.system?.nameEn) ||
        "ไม่ระบุ System",
      assetLevel: asset.assetLevel as TreeAssetLevel,
      code: text(asset.code) || "ยังไม่ระบุรหัส",
      name: text(asset.nameEn) || text(asset.nameTh) || "ยังไม่ระบุชื่อ",
      levelLabel,
      areaZone: text(asset.zone?.name),
      assetType: text(asset.assetType?.nameTh) || text(asset.assetType?.nameEn),
      cmStatus: asset.cmWorks[0]?.status || null,
      cmStatusDetail: asset.cmWorks[0]?.closedAt
        ? formatThaiDate(asset.cmWorks[0].closedAt)
        : null,
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
        {
          label: "SYSTEM",
          value: text(asset.system?.nameTh) || text(asset.system?.nameEn),
        },
        {
          label: "MAIN ASSET",
          value: text(mainAsset?.nameEn) || text(mainAsset?.nameTh),
        },
        {
          label: "SUB-ASSET",
          value: text(subAsset?.nameEn) || text(subAsset?.nameTh),
        },
        {
          label: "PART-ASSET",
          value: text(partAsset?.nameEn) || text(partAsset?.nameTh),
        },
        { label: "CODE ASSET", value: text(asset.code) },
        { label: "ASSET LEVEL", value: levelLabel },
        { label: "AREA / ZONE", value: text(asset.zone?.name) },
        {
          label: "ASSET TYPE",
          value: text(asset.assetType?.nameTh) || text(asset.assetType?.nameEn),
        },
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

  const treeSystems: AssetTreeSystem[] = data.systems
    .map((system) => ({
      id: system.id,
      code: system.code,
      name: system.nameTh || system.nameEn || system.code,
      branches: tree.roots
        .filter((root) => root.asset.systemId === system.id)
        .map(toTreeItem),
    }))
    .filter((system) => system.branches.length);
  const reviewItems = tree.review.map((asset) =>
    toTreeItem({ asset, contextOnly: false, children: [] }),
  );

  return { listUrl, treeSystems, reviewItems };
}

export type AssetListPageModel = ReturnType<typeof buildAssetListPageModel>;
