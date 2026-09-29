import { AppShell } from "../../../components/app-shell";
import { WorkDetailWorkspace } from "../../../components/work-detail-page/work-detail-workspace";
import { requireUser } from "../../../lib/session";
import {
  loadWorkDetailPageData,
  type WorkDetailQuery,
} from "../../../modules/cm-work/work-detail-page-data";

export default async function WorkDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<WorkDetailQuery>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const data = await loadWorkDetailPageData(user, id, await searchParams);
  return (
    <AppShell>
      <WorkDetailWorkspace data={data} />
    </AppShell>
  );
}
