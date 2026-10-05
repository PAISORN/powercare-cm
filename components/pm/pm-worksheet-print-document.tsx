import { Check } from "lucide-react";
import {
  formatThaiDate,
  formatThaiMediumDateTime,
} from "../../lib/date-time/bangkok-time";

type PrintChecklistField = {
  id: string;
  labelTh: string;
  labelEn: string | null;
  indicatorText: string | null;
  unit: string | null;
  result: string;
  other: string;
};

type PrintChecklistSection = {
  id: string;
  code: string | null;
  name: string;
  typeName: string;
  fields: PrintChecklistField[];
};

type PrintAssignee = {
  id: string;
  name: string;
  role: string;
};

export function PmWorksheetPrintDocument({
  asset,
  assignees,
  checklists,
  completedAt,
  completedBy,
  generatedAt,
  organizationName,
  planNumber,
  plannedDate,
  plantName,
  result,
  resultNote,
  startedAt,
  statusLabel,
  workNumber,
}: {
  asset: {
    code: string | null;
    name: string;
    system: string;
    zone: string;
    assetType: string;
    manufacturerModel: string;
    serialNumber: string;
    installationLocation: string;
  };
  assignees: PrintAssignee[];
  checklists: PrintChecklistSection[];
  completedAt: Date | null;
  completedBy: string | null;
  generatedAt: Date;
  organizationName: string;
  planNumber: string;
  plannedDate: string;
  plantName: string;
  result: string | null;
  resultNote: string | null;
  startedAt: Date | null;
  statusLabel: string;
  workNumber: string;
}) {
  const checklistCount = checklists.reduce(
    (sum, checklist) => sum + checklist.fields.length,
    0,
  );
  const recordedCount = checklists.reduce(
    (sum, checklist) =>
      sum + checklist.fields.filter((field) => field.result.trim()).length,
    0,
  );
  const summary = worksheetSummary(result, resultNote);
  const lead = assignees.find((assignee) => assignee.role === "LEAD");

  return (
    <article className="pm-print-document" data-pm-print-document>
      <header className="pm-print-document-header">
        <div>
          <p className="pm-print-brand">POWERCARE CMMS</p>
          <p className="pm-print-organization">
            {organizationName} · {plantName}
          </p>
        </div>
        <div className="pm-print-title-block">
          <h1>ใบงานบำรุงรักษาเชิงป้องกัน</h1>
          <p>PM WORKSHEET</p>
        </div>
      </header>

      <section className="pm-print-control-grid">
        <PrintControl label="เลขที่ใบงาน" value={workNumber} strong />
        <PrintControl label="แผน PM" value={planNumber} />
        <div className="pm-print-control-cell">
          <span>สถานะ</span>
          <strong className="pm-print-status">
            <Check aria-hidden="true" size={14} strokeWidth={3} />
            {statusLabel}
          </strong>
        </div>
        <PrintControl label="วันที่ตามแผน" value={formatDateKey(plannedDate)} />
      </section>

      <PrintSectionTitle>ข้อมูลเครื่องจักรและแผน PM</PrintSectionTitle>
      <section className="pm-print-details-grid">
        <dl>
          <PrintDetail label="รหัสเครื่องจักร" value={asset.code ?? "—"} />
          <PrintDetail label="ชื่อเครื่องจักร" value={asset.name} />
          <PrintDetail label="ระบบ" value={asset.system} />
          <PrintDetail label="พื้นที่ / โซน" value={asset.zone} />
          <PrintDetail label="ประเภท" value={asset.assetType} />
        </dl>
        <dl>
          <PrintDetail label="ผู้ผลิต / รุ่น" value={asset.manufacturerModel} />
          <PrintDetail label="หมายเลขเครื่อง" value={asset.serialNumber} />
          <PrintDetail
            label="เริ่มดำเนินการ"
            value={startedAt ? formatThaiMediumDateTime(startedAt) : "—"}
          />
          <PrintDetail
            label="ดำเนินการเสร็จ"
            value={completedAt ? formatThaiMediumDateTime(completedAt) : "—"}
          />
          <PrintDetail
            label="สถานที่ติดตั้ง"
            value={asset.installationLocation}
          />
        </dl>
      </section>

      <PrintSectionTitle>ทีมผู้ปฏิบัติงาน</PrintSectionTitle>
      <table className="pm-print-team-table">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>ชื่อ-สกุล</th>
            <th>บทบาท</th>
          </tr>
        </thead>
        <tbody>
          {assignees.length ? (
            assignees.map((assignee, index) => (
              <tr key={assignee.id}>
                <td>{index + 1}</td>
                <td>{assignee.name}</td>
                <td>{assigneeRoleLabel(assignee.role)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>ยังไม่ได้ระบุผู้ปฏิบัติงาน</td>
            </tr>
          )}
        </tbody>
      </table>

      {checklists.map((checklist) => (
        <section className="pm-print-checklist" key={checklist.id}>
          <div className="pm-print-section-heading">
            <h2>รายการตรวจเช็ก</h2>
            <p>
              {checklist.code ?? "—"} · {checklist.name} · {checklist.typeName}
            </p>
          </div>
          <table>
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>รายการตรวจเช็ก</th>
                <th>ดัชนีชี้วัด</th>
                <th>ผลตรวจสอบ</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {checklist.fields.length ? (
                checklist.fields.map((field, index) => (
                  <tr key={field.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{field.labelTh}</strong>
                      {field.labelEn ? <small>{field.labelEn}</small> : null}
                    </td>
                    <td>{field.indicatorText || "—"}</td>
                    <td className="pm-print-result-cell">
                      {field.result || "—"}
                      {field.result && field.unit ? ` ${field.unit}` : ""}
                    </td>
                    <td>{field.other || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>ไม่มีรายการตรวจเช็ก</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ))}

      <section className="pm-print-summary">
        <div>
          <h2>สรุปผลการปฏิบัติงาน</h2>
          <p className={`pm-print-summary-result ${summary.tone}`}>
            <Check aria-hidden="true" size={15} strokeWidth={3} />
            {summary.label}
          </p>
          <p>
            บันทึกผลแล้ว {recordedCount} จาก {checklistCount} รายการ
          </p>
        </div>
        <div>
          <h3>สรุป / หมายเหตุเพิ่มเติม</h3>
          <p>{resultNote?.trim() || "ไม่มีหมายเหตุเพิ่มเติม"}</p>
        </div>
      </section>

      <section className="pm-print-signatures">
        <PrintSignature
          date={completedAt}
          label="ผู้ปฏิบัติงาน"
          name={completedBy ?? lead?.name ?? assignees[0]?.name ?? ""}
        />
        <PrintSignature label="ผู้ตรวจสอบ" />
        <PrintSignature label="ผู้อนุมัติ" />
      </section>

      <footer className="pm-print-document-footer">
        <span>เอกสารจากระบบ POWERCARE CMMS</span>
        <span>สร้างเมื่อ {formatThaiMediumDateTime(generatedAt)}</span>
        <span>ต้นฉบับอิเล็กทรอนิกส์</span>
      </footer>
    </article>
  );
}

function PrintControl({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <div className="pm-print-control-cell">
      <span>{label}</span>
      <strong className={strong ? "pm-print-control-strong" : undefined}>
        {value}
      </strong>
    </div>
  );
}

function PrintSectionTitle({ children }: { children: string }) {
  return <h2 className="pm-print-section-title">{children}</h2>;
}

function PrintDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function PrintSignature({
  date,
  label,
  name = "",
}: {
  date?: Date | null;
  label: string;
  name?: string;
}) {
  return (
    <div>
      <h3>{label}</h3>
      <p className="pm-print-signature-line">ลงชื่อ</p>
      <p className="pm-print-signature-name">
        ({name || "................................"})
      </p>
      <p>
        วันที่ {date ? formatThaiDate(date) : "........ / ........ / ........"}
      </p>
    </div>
  );
}

function worksheetSummary(result: string | null, note: string | null) {
  if (note?.trim().startsWith("ไม่สามารถดำเนินการได้")) {
    return { label: "ไม่สามารถดำเนินการได้", tone: "unable" };
  }
  if (result === "NORMAL") {
    return { label: "เสร็จสิ้น (ปกติ)", tone: "normal" };
  }
  return { label: "เสร็จสิ้น (พบปัญหา / แจ้งซ่อม)", tone: "abnormal" };
}

function assigneeRoleLabel(role: string) {
  return role === "LEAD" ? "หัวหน้าทีม" : "ผู้ร่วมปฏิบัติงาน";
}

function formatDateKey(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
