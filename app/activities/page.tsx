import { redirect } from "next/navigation";
import { ActivitiesWorkspace } from "../../components/activities-page/activities-workspace";
import { requireUser } from "../../lib/session";
import { loadActivityPageData } from "../../modules/activities/activity-page-data";
import type { ActivityPageQuery } from "../../modules/activities/activity-types";
import { defaultHomeHref } from "../../modules/auth/default-home-route";
import {
  canUseUserPermission,
  PermissionKey,
} from "../../modules/auth/site-admin-permissions";
import { resolveStorePageScope } from "../../modules/store/store-page-scope";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<ActivityPageQuery>;
}) {
  const user = await requireUser();
  if (!canUseUserPermission(user, PermissionKey.VIEW_MY_ACTIVITIES))
    redirect(defaultHomeHref(user));

  const query = await searchParams;
  const scope = await resolveStorePageScope(user, query);
  const data = await loadActivityPageData(user, scope, query);

  return <ActivitiesWorkspace data={data} query={query} scope={scope} />;
}
