import { fromZonedTime } from "date-fns-tz";

export const BANGKOK_TIME_ZONE = "Asia/Bangkok";

const thaiDateTimeFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist-nu-latn", {
  timeZone: BANGKOK_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const bangkokHourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BANGKOK_TIME_ZONE,
  hour: "numeric",
  hour12: false,
});

function getDatePart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function bangkokDayWindow(date: string) {
  const start = fromZonedTime(`${date}T00:00:00.000`, BANGKOK_TIME_ZONE);
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = next.toISOString().slice(0, 10);

  return {
    start,
    endExclusive: fromZonedTime(`${nextDate}T00:00:00.000`, BANGKOK_TIME_ZONE),
  };
}

export function getBangkokDateString(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function formatThaiDateTime(value: Date) {
  const parts = thaiDateTimeFormatter.formatToParts(value);

  return `${getDatePart(parts, "day")}/${getDatePart(parts, "month")}/${getDatePart(parts, "year")} ${getDatePart(parts, "hour")}:${getDatePart(parts, "minute")} น.`;
}

export function getBangkokHour(value = new Date()) {
  return Number(bangkokHourFormatter.format(value));
}

export function getBangkokTheme(value = new Date()) {
  const hour = getBangkokHour(value);
  return hour >= 6 && hour < 18 ? "day" : "night";
}
