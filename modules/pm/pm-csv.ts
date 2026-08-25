import type { PmWorkQueryRow } from "./pm-query";

export function quoteCsv(value: unknown) {
  const raw = value == null ? "" : String(value);
  // PM export cells are textual. Neutralize every formula prefix, including
  // numeric-looking minus values, after leading whitespace/control characters.
  const text = /^[\u0000-\u0020\u007f-\u009f]*[=+\-@]/u.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createPmWorkCsv(rows: PmWorkQueryRow[]) {
  const header = ["เลขที่ PM", "วันที่วางแผน", "รหัส Asset", "ชื่อ Asset", "PM Group", "ผู้รับผิดชอบ", "สถานะ", "ผล PM", "หมายเหตุ"];
  const body = rows.map(row => [
    row.number, row.pmPlan.plannedDateKey, row.assetCodeSnapshot ?? "", row.assetNameSnapshot,
    row.sourceGroups.map(source => `${source.pmPlanGroupSnapshot.codeSnapshot} · ${source.pmPlanGroupSnapshot.nameSnapshot}`).join("; "),
    row.assignees.map(assignee => `${assignee.user.fullName} (${assignee.role})`).join("; "),
    row.status, row.result ?? "", row.resultNote ?? "",
  ]);
  return `\uFEFF${[header, ...body].map(columns => columns.map(quoteCsv).join(",")).join("\r\n")}\r\n`;
}
