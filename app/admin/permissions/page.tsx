import { PermissionCenterWorkspace } from "../../../components/admin-permissions-page/permission-center-workspace";
import {
  getPermissionCenterPageData,
  type PermissionCenterQuery,
} from "../../../modules/auth/permission-center-page-data";

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<PermissionCenterQuery>;
}) {
  const data = await getPermissionCenterPageData(await searchParams);
  return <PermissionCenterWorkspace {...data} />;
}
