import { redirect } from "next/navigation";
import { AdminUsersWorkspace } from "../../../components/admin-users-page/admin-users-workspace";
import { requireUser } from "../../../lib/session";
import type { AdminUsersSearchParams } from "../../../modules/users/admin-user-page-model";
import { loadAdminUsersPageData } from "../../../modules/users/admin-users-page-data";
import { canManageUsers } from "../../../modules/users/user-admin-scope";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminUsersSearchParams>;
}) {
  const user = await requireUser();
  if (!canManageUsers(user)) redirect("/dashboardcm");
  const data = await loadAdminUsersPageData(user, await searchParams);
  return <AdminUsersWorkspace data={data} />;
}
