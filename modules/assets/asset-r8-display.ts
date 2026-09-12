type AssetHierarchyNode = {
  assetLevel: string;
  nameTh: string;
  nameEn?: string | null;
  parent?: AssetHierarchyNode | null;
};

function displayName(asset: AssetHierarchyNode | null | undefined) {
  return asset ? asset.nameEn?.trim() || asset.nameTh : null;
}

export function resolveAssetR8Names(asset: AssetHierarchyNode) {
  const parent = asset.parent ?? null;
  const mainAsset = asset.assetLevel === "MAIN_ASSET" ? asset : asset.assetLevel === "SUB_ASSET" ? parent : parent?.assetLevel === "MAIN_ASSET" ? parent : parent?.parent ?? null;
  const subAsset = asset.assetLevel === "SUB_ASSET" ? asset : asset.assetLevel === "PART" && parent?.assetLevel === "SUB_ASSET" ? parent : null;
  const partAsset = asset.assetLevel === "PART" ? asset : null;
  return { mainAsset: displayName(mainAsset), subAsset: displayName(subAsset), partAsset: displayName(partAsset) };
}
