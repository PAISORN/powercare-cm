import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { db } from "../../lib/db";
import { parseCmDateFilter } from "../filters/cm-date-filter";
import { queryDailyReport } from "../reports/daily-report";
import type { ReportScope } from "../reports/report-scope";
import { deliverLineDailyReport } from "./line-service";
import {
  buildLineDailyReportMessage,
  getScopedLineDailyReportSettingId,
  parseLineDailyReportTemplate,
  type LineDailyReportDateMode,
} from "./line-daily-report-settings";

type DailyReportSetting = {
  enabled: boolean;
  destinationId: string | null;
  sendTime: string;
  dateMode: string;
  templateJson: string;
  destination: {
    id: string;
    targetId: string;
    displayName: string;
    active: boolean;
    organizationId: string | null;
    plantId: string | null;
    categoryId: string | null;
  } | null;
};

type DailyReportQueryInput = {
  date: string;
  organizationId?: string | null;
  plantId?: string | null;
  categoryId?: string | null;
};

type DailyReportDeliveryInput = {
  eventId: string;
  destinationId: string;
  targetId: string;
  text: string;
};

export type LineDailyReportDispatchResult =
  | { status: "SENT"; date: string; destinationId: string }
  | { status: "SKIPPED"; reason: "DISABLED" | "NO_DESTINATION" | "DESTINATION_INACTIVE" | "NOT_DUE" };

export type LineDailyReportDispatchAllResult = {
  status: "DONE";
  total: number;
  sent: number;
  skipped: number;
  results: LineDailyReportDispatchResult[];
};

export function createLineDailyReportDispatcher({
  getSetting,
  queryReport,
  deliver,
}: {
  getSetting: () => Promise<DailyReportSetting | null>;
  queryReport: (input: DailyReportQueryInput) => Promise<Parameters<typeof buildLineDailyReportMessage>[0]>;
  deliver: (input: DailyReportDeliveryInput) => Promise<void>;
}) {
  return {
    async dispatch({
      now = new Date(),
      force = false,
      eventIdSuffix,
    }: { now?: Date; force?: boolean; eventIdSuffix?: string } = {}): Promise<LineDailyReportDispatchResult> {
      const setting = await getSetting();
      if (!setting?.enabled) return { status: "SKIPPED", reason: "DISABLED" };
      if (!setting.destination) return { status: "SKIPPED", reason: "NO_DESTINATION" };
      if (!setting.destination.active) return { status: "SKIPPED", reason: "DESTINATION_INACTIVE" };
      if (!force && !isLineDailyReportDue(setting.sendTime, now)) {
        return { status: "SKIPPED", reason: "NOT_DUE" };
      }

      const date = resolveLineDailyReportDate(normalizeDateMode(setting.dateMode), now);
      const report = await queryReport({
        date,
        categoryId: setting.destination.categoryId,
        organizationId: setting.destination.organizationId,
        plantId: setting.destination.plantId,
      });
      const text = buildLineDailyReportMessage(report, parseLineDailyReportTemplate(setting.templateJson));
      await deliver({
        eventId: buildLineDailyReportEventId(date, setting.destination.id, eventIdSuffix),
        destinationId: setting.destination.id,
        targetId: setting.destination.targetId,
        text,
      });
      return { status: "SENT", date, destinationId: setting.destination.id };
    },
  };
}

export function buildLineDailyReportEventId(date: string, destinationId: string, suffix?: string) {
  return `LINE_DAILY_REPORT:${date}:${destinationId}${suffix ? `:${suffix}` : ""}`;
}

export function resolveLineDailyReportDate(mode: LineDailyReportDateMode, now = new Date()) {
  const today = getBangkokDateString(now);
  if (mode === "TODAY") return today;
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function isLineDailyReportDue(sendTime: string, now = new Date()) {
  return getBangkokHourMinute(now) === sendTime;
}

export async function dispatchLineDailyReport(input: { now?: Date; force?: boolean; eventIdSuffix?: string; organizationId?: string; plantId?: string | null } = {}) {
  const settingId = getScopedLineDailyReportSettingId(input.organizationId, input.plantId);
  return createLineDailyReportDispatcher({
    getSetting: () =>
      db.lineDailyReportSetting.findUnique({
        where: { id: settingId },
        include: { destination: true },
      }),
    queryReport: ({ date, categoryId, organizationId, plantId }) =>
      queryDailyReport({
        mode: "range",
        startDate: date,
        endDate: date,
        categoryId: categoryId || undefined,
        dateFilter: parseCmDateFilter({ mode: "range", startDate: date, endDate: date }),
      }, buildDailyReportScope({ organizationId, plantId })),
    deliver: ({ eventId, destinationId, targetId, text }) =>
      deliverLineDailyReport({ eventId, destinationId, targetId, text }),
  }).dispatch(input);
}

export async function dispatchAllLineDailyReports(input: { now?: Date; force?: boolean; eventIdSuffix?: string } = {}): Promise<LineDailyReportDispatchAllResult> {
  const settings = await db.lineDailyReportSetting.findMany({
    where: { enabled: true },
    select: { organizationId: true, plantId: true },
  });
  const results = [];
  for (const setting of settings) {
    results.push(await dispatchLineDailyReport({
      ...input,
      organizationId: setting.organizationId ?? undefined,
      plantId: setting.plantId,
    }));
  }
  return {
    status: "DONE",
    total: results.length,
    sent: results.filter((result) => result.status === "SENT").length,
    skipped: results.filter((result) => result.status === "SKIPPED").length,
    results,
  };
}

function buildDailyReportScope({ organizationId, plantId }: { organizationId?: string | null; plantId?: string | null }): ReportScope {
  if (plantId) return { plantId };
  if (organizationId) return { organizationId };
  return {};
}

function normalizeDateMode(value: string): LineDailyReportDateMode {
  return value === "TODAY" ? "TODAY" : "YESTERDAY";
}

function getBangkokHourMinute(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${read("hour")}:${read("minute")}`;
}
