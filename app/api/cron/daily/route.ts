import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "../../../../modules/cron/cron-authorization";
import { dispatchAllLineDailyReports } from "../../../../modules/line/line-daily-report-dispatcher";
import { dispatchPmDueOverdueNotifications } from "../../../../modules/pm/pm-notification-service";

export const dynamic = "force-dynamic";

type DailyJob = { name: string; run: () => Promise<unknown> };

export async function runDailyCoordinator(jobs: DailyJob[]) {
  const settled = await Promise.allSettled(jobs.map(job => job.run()));
  const results = settled.map((result, index) => result.status === "fulfilled"
    ? { name: jobs[index].name, ok: true as const, result: result.value }
    : { name: jobs[index].name, ok: false as const, error: errorMessage(result.reason) });
  return { ok: results.every(result => result.ok), results };
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const result = await runDailyCoordinator([
    { name: "lineDailyReport", run: () => dispatchAllLineDailyReports({ force }) },
    { name: "pmDueOverdue", run: () => dispatchPmDueOverdueNotifications() },
  ]);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Daily job failed";
}
