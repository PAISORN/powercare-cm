import { NextResponse } from "next/server";
import { dispatchAllLineDailyReports } from "../../../../modules/line/line-daily-report-dispatcher";
import { isAuthorizedCronRequest } from "../../../../modules/cron/cron-authorization";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";
  const result = await dispatchAllLineDailyReports({ force });
  return NextResponse.json({ ok: true, ...result });
}
