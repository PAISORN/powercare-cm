import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import type { IssueItemKind } from "./issue-line-items-editor";

export type IssueType = "CM_REFERENCED" | "DIRECT";

export type CmOption = {
  id: string;
  number: string;
  label: string;
};

type IssueRequestContextSectionProps = {
  cmWorks: CmOption[];
  directOnly: boolean;
  issueType: IssueType;
  itemKind: IssueItemKind;
  lockedCmWork?: CmOption;
  onIssueTypeChange: (issueType: IssueType) => void;
  publicRequester?: { contactRequired?: boolean };
  requesterSummary?: { name: string; department?: string | null };
};

export function IssueRequestContextSection({
  cmWorks,
  directOnly,
  issueType,
  itemKind,
  lockedCmWork,
  onIssueTypeChange,
  publicRequester,
  requesterSummary,
}: IssueRequestContextSectionProps) {
  const selectedIssueType = lockedCmWork
    ? "CM_REFERENCED"
    : directOnly
      ? "DIRECT"
      : issueType;

  return (
    <>
      {lockedCmWork ? (
        <>
          <input name="issueType" type="hidden" value="CM_REFERENCED" />
          <input
            name="cmWorkNumber"
            type="hidden"
            value={lockedCmWork.number}
          />
        </>
      ) : directOnly ? (
        <input name="issueType" type="hidden" value="DIRECT" />
      ) : null}

      <section className="overflow-visible rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
        <SectionHeading icon={<UserRound size={19} />} title="ผู้เบิก" />
        <div className="grid gap-4 p-4 sm:p-5">
          {requesterSummary ? (
            <div className="grid gap-4">
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/15">
                  <UserRound size={25} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--muted)]">
                    ผู้เบิก
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-[var(--ink)]">
                    {requesterSummary.name}
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className={labelClass}>
                  หน่วยงาน / แผนก
                  <span
                    className={`${inputClass} flex items-center gap-3 font-semibold`}
                  >
                    <Building2
                      className="shrink-0 text-[var(--primary)]"
                      size={20}
                    />
                    {requesterSummary.department || "-"}
                  </span>
                </label>
                <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--soft)] px-4 text-sm font-semibold text-[var(--muted)]">
                  <CalendarDays size={17} />
                  {new Intl.DateTimeFormat("th-TH", {
                    dateStyle: "medium",
                  }).format(new Date())}
                </span>
              </div>
            </div>
          ) : null}

          {publicRequester ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                ชื่อ-นามสกุล ผู้เบิก
                <input className={inputClass} name="requesterName" required />
              </label>
              <label className={labelClass}>
                หน่วยงาน / แผนก
                <input
                  className={inputClass}
                  name="requesterDepartment"
                  required
                />
              </label>
            </div>
          ) : null}

          {lockedCmWork ? (
            <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 px-4 py-3 text-sm">
              <p className="font-extrabold text-[var(--primary)]">
                Store Request สำหรับงานนี้
              </p>
              <p className="mt-1 text-[var(--muted)]">
                {lockedCmWork.number} · {lockedCmWork.label}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {!directOnly ? (
                <fieldset className="grid gap-1.5 md:col-span-2">
                  <legend className="text-sm font-bold">ประเภทการเบิก</legend>
                  <div className="grid grid-cols-2 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-1">
                    {[
                      ["CM_REFERENCED", "ดำเนินงาน CM", Wrench],
                      ["DIRECT", "เบิกโดยตรง", ClipboardCheck],
                    ].map(([value, label, Icon]) => (
                      <label
                        className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-center text-sm font-bold ${
                          issueType === value
                            ? "bg-[var(--primary)] text-white shadow-sm"
                            : "text-[var(--muted)]"
                        }`}
                        key={String(value)}
                      >
                        <input
                          checked={issueType === value}
                          className="sr-only"
                          name="issueType"
                          onChange={() => onIssueTypeChange(value as IssueType)}
                          type="radio"
                          value={String(value)}
                        />
                        <Icon size={16} />
                        {String(label)}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {selectedIssueType === "CM_REFERENCED" ? (
                <label className={labelClass}>
                  เลขที่ CM ภายใน Site
                  <select
                    className={inputClass}
                    defaultValue=""
                    name="cmWorkNumber"
                    required
                  >
                    <option disabled value="">
                      ค้นหาและเลือกเลขที่ CM
                    </option>
                    {cmWorks.map((work) => (
                      <option key={work.id} value={work.number}>
                        {work.number} · {work.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className={labelClass}>
                  เหตุผลการเบิก
                  <input className={inputClass} name="note" required />
                </label>
              )}
            </div>
          )}

          {selectedIssueType === "CM_REFERENCED" && !lockedCmWork ? (
            <label className={labelClass}>
              รายละเอียดการเบิก / เหตุผล / งานที่เกี่ยวข้อง
              <textarea
                className={`${inputClass} min-h-20 resize-y py-3`}
                name="note"
                placeholder="ระบุรายละเอียดเพิ่มเติม (ไม่บังคับ)"
              />
            </label>
          ) : null}

          {itemKind === "OIL" ? <OilIssueFields /> : null}
        </div>
      </section>
    </>
  );
}

function OilIssueFields() {
  return (
    <fieldset className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)]/45 p-4 shadow-[var(--shadow)] sm:grid-cols-2">
      <legend className="px-2 font-extrabold">ข้อมูลรถและการจ่ายน้ำมัน</legend>
      <label className={labelClass}>
        รถที่นำไปใช้
        <input
          className={inputClass}
          name="vehicle"
          placeholder="ทะเบียนรถ / ชื่อรถ / รหัสรถ"
          required
        />
      </label>
      <label className={labelClass}>
        เลขไมล์ก่อนเติม
        <input
          className={inputClass}
          inputMode="decimal"
          min="0"
          name="odometerBefore"
          placeholder="0"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className={labelClass}>
        เลขไมล์หลังเติม
        <input
          className={inputClass}
          inputMode="decimal"
          min="0"
          name="odometerAfter"
          placeholder="0"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className={labelClass}>
        มิเตอร์หัวจ่ายก่อนเติม
        <input
          className={inputClass}
          inputMode="decimal"
          min="0"
          name="dispenserMeterBefore"
          placeholder="0.00"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className={`${labelClass} sm:col-span-2`}>
        มิเตอร์หัวจ่ายหลังเติม
        <input
          className={inputClass}
          inputMode="decimal"
          min="0"
          name="dispenserMeterAfter"
          placeholder="0.00"
          required
          step="0.01"
          type="number"
        />
      </label>
    </fieldset>
  );
}

function SectionHeading({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
      <h3 className="flex items-center gap-2 text-lg font-extrabold">
        <span className="text-[var(--primary)]">{icon}</span>
        {title}
      </h3>
    </div>
  );
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--ink)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";
const labelClass = "grid gap-1.5 text-sm font-bold";
