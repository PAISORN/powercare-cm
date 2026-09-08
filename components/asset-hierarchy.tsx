import type { ReactNode } from "react";

export type HierarchyAsset = { id: string; parentId: string | null; systemId: string | null; assetLevel: string | null; migrationStatus?: string | null };
export type AssetBranch<T> = { asset: T; contextOnly: boolean; children: AssetBranch<T>[] };

// Only actual, valid relationships enter the tree. Unresolved rows remain visible for review.
export function buildAssetHierarchy<T extends HierarchyAsset>(assets: T[], matchingIds: Set<string>, systemIds: Set<string>) {
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const valid = new Map<string, boolean>();
  function isValid(asset: T, visiting = new Set<string>()): boolean {
    if (valid.has(asset.id)) return valid.get(asset.id)!;
    if (visiting.has(asset.id) || !asset.systemId || !systemIds.has(asset.systemId) || (asset.migrationStatus && asset.migrationStatus !== "READY")) return false;
    visiting.add(asset.id);
    let result = asset.assetLevel === "MAIN_ASSET" && !asset.parentId;
    if (asset.parentId) {
      const parent = byId.get(asset.parentId);
      result = !!parent && parent.systemId === asset.systemId && ((asset.assetLevel === "SUB_ASSET" && parent.assetLevel === "MAIN_ASSET") || (asset.assetLevel === "PART" && ["MAIN_ASSET", "SUB_ASSET"].includes(parent.assetLevel || ""))) && isValid(parent, visiting);
    }
    visiting.delete(asset.id);
    valid.set(asset.id, result);
    return result;
  }
  const visible = new Set<string>();
  const review: T[] = [];
  for (const asset of assets) {
    if (!matchingIds.has(asset.id)) continue;
    if (!isValid(asset)) { review.push(asset); continue; }
    let current: T | undefined = asset;
    while (current && !visible.has(current.id)) { visible.add(current.id); current = current.parentId ? byId.get(current.parentId) : undefined; }
  }
  const nodes = new Map<string, AssetBranch<T>>();
  for (const asset of assets) if (visible.has(asset.id)) nodes.set(asset.id, { asset, contextOnly: !matchingIds.has(asset.id), children: [] });
  const roots: AssetBranch<T>[] = [];
  for (const node of nodes.values()) {
    if (node.asset.parentId) nodes.get(node.asset.parentId)?.children.push(node);
    else roots.push(node);
  }
  return { roots, review };
}

export function AssetBranches<T extends HierarchyAsset>({ branches, renderRow }: { branches: AssetBranch<T>[]; renderRow: (asset: T, contextOnly: boolean) => ReactNode }) {
  return <ul className="space-y-1">{branches.map(branch => <li key={branch.asset.id}>{renderRow(branch.asset, branch.contextOnly)}{branch.children.length > 0 ? <div className="ml-3 border-l-2 border-[var(--line)] pl-2 sm:ml-6 sm:pl-3"><AssetBranches branches={branch.children} renderRow={renderRow}/></div> : null}</li>)}</ul>;
}

export const assetLevelLabel = (level: string | null | undefined) => ({ MAIN_ASSET: "Main Asset", SUB_ASSET: "Sub-Asset", PART: "Part" }[level || ""] || "รอจัดระดับ");
