import { getBangkokDateString } from "../../lib/date-time/bangkok-time";
import { db } from "../../lib/db";
import { parseCmDateFilter } from "../filters/cm-date-filter";
import { queryDailyReport } from "../reports/daily-report";
import { deliverLineDailyReport } from "./line-service";
import {
  buildLineDailyReportMessage,
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
    categoryId: string | null;
  } | null;
};

type DailyReportQueryInput = {
  date: string;
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
    async dispatch({ now = new Date(), force = false }: { now?: Date; force?: boolean } = {}): Promise<LineDailyReportDispatchResult> {
      const setting = await getSetting();
      if (!setting?.enabled) return { status: "SKIPPED", reason: "DISABLED" };
      if (!setting.destination) return { status: "SKIPPED", reason: "NO_DESTINATION" };
      if (!setting.destination.active) return { status: "SKIPPED", reason: "DESTINATION_INACTIVE" };
      if (!force && !isLineDailyReportDue(setting.sendTime, now)) {
        return { status: "SKIPPED", reason: "NOT_DUE" };
      }

      const date = resolveLineDailyReportDate(normalizeDateMode(setting.dateMode), now);
      const report = await queryReport({ date, categoryId: setting.destination.categoryId });
      const text = buildLineDailyReportMessage(report, parseLineDailyReportTemplate(setting.templateJson));
      await deliver({
        eventId: buildLineDailyReportEventId(date, setting.destination.id),
        destinationId: setting.destination.id,
        targetId: setting.destination.targetId,
        text,
      });
      return { status: "SENT", date, destinationId: setting.destination.id };
    },
  };
}

export function buildLineDailyReportEventId(date: string, destinationId: string) {
  return `LINE_DAILY_REPORT:${date}:${destinationId}`;
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

export async function dispatchLineDailyReport(input: { now?: Date; force?: boolean } = {}) {
  return createLineDailyReportDispatcher({
    getSetting: () =>
      db.lineDailyReportSetting.findUnique({
        where: { id: "default" },
        include: { destination: true },
      }),
    queryReport: ({ date, categoryId }) =>
      queryDailyReport({
        mode: "range",
        startDate: date,
        endDate: date,
        categoryId: categoryId || undefined,
        dateFilter: parseCmDateFilter({ mode: "range", startDate: date, endDate: date }),
      }),
    deliver: ({ eventId, destinationId, targetId, text }) =>
      deliverLineDailyReport({ eventId, destinationId, targetId, text }),
  }).dispatch(input);
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
