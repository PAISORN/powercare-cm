import { redirect } from "next/navigation";
import { AssetRegistryPage } from "../../components/asset-registry-page";
import { requireUser } from "../../lib/session";
import {
  canManageAssetMasters,
  canManageAssets,
  canRecodeAssets,
  canViewAssets,
} from "../../modules/auth/permission";
import { loadAssetListPageData } from "../../modules/assets/asset-list-page-data";
import { buildAssetListPageModel } from "../../modules/assets/asset-list-page-model";
import type { AssetListQuery } from "../../modules/assets/asset-list-query";
import { resolveAssetScope } from "../../modules/assets/asset-scope";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<AssetListQuery>;
}) {
  const user = await requireUser();
  if (!canViewAssets(user)) redirect("/dashboardcm");

  const query = await searchParams;
  const scope = await resolveAssetScope(user, query);
  const data = await loadAssetListPageData(scope.plant.id, query);
  const model = buildAssetListPageModel(data, query, {
    organizationId: scope.organization.id,
    plantId: scope.plant.id,
  });

  return (
    <AssetRegistryPage
      data={data}
      model={model}
      permissions={{
        canManageAssets: canManageAssets(user),
        canManageAssetMasters: canManageAssetMasters(user),
        canRecodeAssets: canRecodeAssets(user),
      }}
      query={query}
      scope={scope}
    />
  );
}
