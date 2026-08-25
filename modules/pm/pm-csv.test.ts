import { describe, expect, it } from "vitest";
import { createPmWorkCsv, quoteCsv } from "./pm-csv";

describe("PM CSV", () => {
  it("uses a UTF-8 BOM and RFC-compatible escaping without damaging Thai", () => {
    expect(quoteCsv('มอเตอร์, "หลัก"\nชั้น 2')).toBe('"มอเตอร์, ""หลัก""\nชั้น 2"');
    const csv = createPmWorkCsv([{ number: "PM-1", pmPlan: { id: "p", number: "PMP-1", plannedDateKey: "2026-08-15" }, assetId: "a", assetCodeSnapshot: "A,1", assetNameSnapshot: 'ปั๊ม "หลัก"\nชั้น 2', asset: { registrationStatus: "ACTIVE" }, status: "COMPLETED", result: "NORMAL", resultNote: "ปกติ", startedAt: null, completedAt: null, assignees: [], sourceGroups: [] }] as never);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"A,1"');
    expect(csv).toContain('"ปั๊ม ""หลัก""\nชั้น 2"');
    const bytes = new TextEncoder().encode(csv);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes)).toContain("เลขที่ PM");
  });

  it.each(["=1+1", "+SUM(A1:A2)", "-42", "@cmd", "  =hidden", "\t+hidden", "\u0001-hidden"])('neutralizes spreadsheet formula input %j', value => {
    expect(quoteCsv(value)).toContain(`'${value}`);
  });

  it.each(["motor-42", "123", " ปกติ", "ข้อความธรรมดา"])("leaves ordinary text unchanged: %j", value => {
    expect(quoteCsv(value)).toBe(value);
  });
});
