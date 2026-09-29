import { AppShell } from "../../components/app-shell";
import { WorkListWorkspace } from "../../components/work-list-page/work-list-workspace";
import { requireUser } from "../../lib/session";
import { loadWorkListPageData } from "../../modules/cm-work/work-list-page-data";
import type { WorkSearchParams } from "../../modules/cm-work/work-list-query";

export default async function WorkListPage({
  searchParams,
}: {
  searchParams: Promise<WorkSearchParams>;
}) {
  const user = await requireUser();
  const data = await loadWorkListPageData(user, await searchParams);
  return (
    <AppShell>
      <WorkListWorkspace {...data} />
    </AppShell>
  );
}
