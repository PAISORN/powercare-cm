import { redirect } from "next/navigation";
import { AdminOrganizationWorkspace } from "../../../components/admin-organization-page/admin-organization-workspace";
import { requireUser } from "../../../lib/session";
import {
  canManageOrganization,
  canManagePlantProfile,
} from "../../../modules/auth/permission";
import {
  loadAdminOrganizationPageData,
  type AdminOrganizationQuery,
} from "../../../modules/organization/admin-organization-page-data";

export default async function AdminOrganizationPage({
  searchParams,
}: {
  searchParams: Promise<AdminOrganizationQuery>;
}) {
  const user = await requireUser();
  if (!canManageOrganization(user) && !canManagePlantProfile(user)) {
    redirect("/dashboardcm");
  }
  const data = await loadAdminOrganizationPageData(user, await searchParams);
  return <AdminOrganizationWorkspace data={data} />;
}
