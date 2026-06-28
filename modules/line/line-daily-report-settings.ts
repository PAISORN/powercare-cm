import { db } from "../../lib/db";
import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";

export const lineDailyReportSettingId = "default";

export type LineDailyReportDateMode = "TODAY" | "YESTERDAY";

export type LineDailyReportTemplate = {
  showNewCount: boolean;
  showClosedCount: boolean;
  showNewList: boolean;
  showClosedList: boolean;
  showCategory: boolean;
  showZone: boolean;
  showMachineName: boolean;
  showProblemTitle: boolean;
  showRequester: boolean;
  showClaimant: boolean;
  showTimes: boolean;
  showCategorySummary: boolean;
  showZoneSummary: boolean;
};

type ReportWork = {
  cmNumber: string;
  machineName?: string | null;
  problemTitle?: string | null;
  requesterName?: string | null;
  createdAt?: Date | string | null;
  closedAt?: Date | string | null;
  category?: { name: string } | null;
  zone?: { name: string } | null;
  claimant?: { fullName: string } | null;
};

type LineDailyReportData = {
  startDate: string;
  endDate: string;
  newCount: number;
  closedCount: number;
  newWorks: ReportWork[];
  closedWorks: ReportWork[];
};

export const defaultLineDailyReportTemplate: LineDailyReportTemplate = {
  showNewCount: true,
  showClosedCount: true,
  showNewList: true,
  showClosedList: true,
  showCategory: true,
  showZone: true,
  showMachineName: true,
  showProblemTitle: true,
  showRequester: false,
  showClaimant: false,
  showTimes: false,
  showCategorySummary: false,
  showZoneSummary: false,
};

export const lineDailyReportTemplateFields: Array<{
  key: keyof LineDailyReportTemplate;
  label: string;
  description: string;
}> = [
  { key: "showNewCount", label: "จำนวนงานแจ้งใหม่", description: "แสดงตัวเลขงานที่แจ้งเข้ามาในช่วงรายงาน" },
  { key: "showClosedCount", label: "จำนวนงานปิดแล้ว", description: "แสดงตัวเลขงานที่ปิดสำเร็จในช่วงรายงาน" },
  { key: "showNewList", label: "รายการงานแจ้งใหม่", description: "แสดงเลข CM และรายละเอียดงานแจ้งใหม่" },
  { key: "showClosedList", label: "รายการงานปิดแล้ว", description: "แสดงเลข CM และรายละเอียดงานที่ปิดแล้ว" },
  { key: "showCategory", label: "ประเภทงาน", description: "เช่น งานไฟฟ้า งานเครื่องกล" },
  { key: "showZone", label: "Zone", description: "พื้นที่หรือหน่วยงานที่เกี่ยวข้อง" },
  { key: "showMachineName", label: "ชื่อเครื่องจักร", description: "แสดงเครื่องจักรหรืออุปกรณ์" },
  { key: "showProblemTitle", label: "ชื่องาน/ปัญหา", description: "แสดงหัวข้อปัญหาหรือชื่องาน" },
  { key: "showRequester", label: "ผู้แจ้ง", description: "แสดงชื่อผู้แจ้งซ่อม" },
  { key: "showClaimant", label: "ผู้รับงาน", description: "แสดงชื่อช่างหรือวิศวกรที่รับผิดชอบ" },
  { key: "showTimes", label: "เวลา", description: "แสดงวันเวลาที่แจ้งหรือปิดงาน" },
  { key: "showCategorySummary", label: "สรุปตามประเภทงาน", description: "รวมจำนวนงานแยกตาม Category" },
  { key: "showZoneSummary", label: "สรุปตาม Zone", description: "รวมจำนวนงานแยกตาม Zone" },
];

export function parseLineDailyReportTemplate(value?: string | null): LineDailyReportTemplate {
  if (!value) return { ...defaultLineDailyReportTemplate };
  try {
    const parsed = JSON.parse(value) as Partial<Record<keyof LineDailyReportTemplate, unknown>>;
    return lineDailyReportTemplateFields.reduce(
      (template, field) => ({
        ...template,
        [field.key]: typeof parsed[field.key] === "boolean" ? parsed[field.key] : template[field.key],
      }),
      { ...defaultLineDailyReportTemplate },
    );
  } catch {
    return { ...defaultLineDailyReportTemplate };
  }
}

export function serializeLineDailyReportTemplate(template: LineDailyReportTemplate) {
  return JSON.stringify(template);
}

export function templateFromFormData(formData: FormData): LineDailyReportTemplate {
  return lineDailyReportTemplateFields.reduce(
    (template, field) => ({ ...template, [field.key]: formData.get(field.key) === "on" }),
    { ...defaultLineDailyReportTemplate },
  );
}

export function normalizeLineDailyReportDateMode(value: FormDataEntryValue | null): LineDailyReportDateMode {
  return value === "TODAY" ? "TODAY" : "YESTERDAY";
}

export function normalizeLineDailyReportSendTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return /^\d{2}:\d{2}$/.test(text) ? text : "08:00";
}

export async function getLineDailyReportSetting() {
  const setting = await db.lineDailyReportSetting.findUnique({
    where: { id: lineDailyReportSettingId },
    include: { destination: true },
  });
  return {
    id: lineDailyReportSettingId,
    enabled: setting?.enabled ?? false,
    destinationId: setting?.destinationId ?? "",
    destination: setting?.destination ?? null,
    sendTime: setting?.sendTime ?? "08:00",
    dateMode: normalizeLineDailyReportDateMode(setting?.dateMode ?? "YESTERDAY"),
    template: parseLineDailyReportTemplate(setting?.templateJson),
  };
}

export async function saveLineDailyReportSetting(input: {
  enabled: boolean;
  destinationId: string | null;
  sendTime: string;
  dateMode: LineDailyReportDateMode;
  template: LineDailyReportTemplate;
}) {
  return db.lineDailyReportSetting.upsert({
    where: { id: lineDailyReportSettingId },
    create: {
      id: lineDailyReportSettingId,
      enabled: input.enabled,
      destinationId: input.destinationId,
      sendTime: input.sendTime,
      dateMode: input.dateMode,
      templateJson: serializeLineDailyReportTemplate(input.template),
    },
    update: {
      enabled: input.enabled,
      destinationId: input.destinationId,
      sendTime: input.sendTime,
      dateMode: input.dateMode,
      templateJson: serializeLineDailyReportTemplate(input.template),
    },
  });
}

export function buildLineDailyReportMessage(report: LineDailyReportData, template: LineDailyReportTemplate) {
  const lines = [
    "[PowerCare.CM]",
    `รายงานสรุปงานซ่อม ${formatReportRange(report.startDate, report.endDate)}`,
  ];

  if (template.showNewCount) lines.push(`แจ้งใหม่: ${report.newCount} งาน`);
  if (template.showClosedCount) lines.push(`ปิดงาน: ${report.closedCount} งาน`);
  appendSummary(lines, "สรุปตามประเภทงาน", [...report.newWorks, ...report.closedWorks], "category", template.showCategorySummary);
  appendSummary(lines, "สรุปตาม Zone", [...report.newWorks, ...report.closedWorks], "zone", template.showZoneSummary);
  appendWorkSection(lines, "รายการแจ้งใหม่", report.newWorks, template, "createdAt", template.showNewList);
  appendWorkSection(lines, "รายการปิดงาน", report.closedWorks, template, "closedAt", template.showClosedList);
  return lines.join("\n");
}

function appendWorkSection(
  lines: string[],
  title: string,
  works: ReportWork[],
  template: LineDailyReportTemplate,
  dateField: "createdAt" | "closedAt",
  enabled: boolean,
) {
  if (!enabled) return;
  lines.push("", `${title}:`);
  if (!works.length) {
    lines.push("- ไม่มีรายการ");
    return;
  }
  for (const work of works.slice(0, 10)) {
    lines.push(`- ${work.cmNumber}`);
    if (template.showProblemTitle && work.problemTitle) lines.push(`  งาน: ${work.problemTitle}`);
    if (template.showCategory && work.category?.name) lines.push(`  ประเภท: ${work.category.name}`);
    if (template.showZone && work.zone?.name) lines.push(`  โซน: ${work.zone.name}`);
    if (template.showMachineName && work.machineName) lines.push(`  เครื่องจักร: ${work.machineName}`);
    if (template.showRequester && work.requesterName) lines.push(`  ผู้แจ้ง: ${work.requesterName}`);
    if (template.showClaimant && work.claimant?.fullName) lines.push(`  ผู้รับงาน: ${work.claimant.fullName}`);
    const timestamp = work[dateField];
    if (template.showTimes && timestamp) lines.push(`  เวลา: ${formatThaiDateTime(new Date(timestamp))}`);
  }
  if (works.length > 10) lines.push(`- และอีก ${works.length - 10} รายการ`);
}

function appendSummary(
  lines: string[],
  title: string,
  works: ReportWork[],
  field: "category" | "zone",
  enabled: boolean,
) {
  if (!enabled || !works.length) return;
  const counts = new Map<string, number>();
  for (const work of works) {
    const name = work[field]?.name ?? "ไม่ระบุ";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  lines.push("", `${title}:`);
  for (const [name, count] of counts) lines.push(`- ${name}: ${count}`);
}

function formatReportRange(startDate: string, endDate: string) {
  return startDate === endDate ? startDate : `${startDate} - ${endDate}`;
}
