import { formatThaiDateTime } from "../../lib/date-time/bangkok-time";
import { statusLabels, urgencyLabels, type Urgency, type WorkStatus } from "../cm-work/cm-work-types";

type ReportExportSource = {
  number: string;
  createdAt: Date;
  closedAt: Date | null;
  requesterName: string;
  requesterDepartment: string;
  machineName: string;
  problemTitle: string;
  urgency: string;
  status: string;
  category: { name: string };
  zone: { name: string };
  claimant: { fullName: string } | null;
  reviewer: { fullName: string } | null;
};

export function toReportExportRow(work: ReportExportSource): Record<string, string | number | null> {
  return {
    "เลขที่แจ้งซ่อม": work.number,
    "วันที่แจ้ง": formatThaiDateTime(work.createdAt),
    "วันที่ปิด": work.closedAt ? formatThaiDateTime(work.closedAt) : "",
    "ผู้แจ้งซ่อม": work.requesterName,
    "หน่วยงาน": work.requesterDepartment,
    Category: work.category.name,
    Zone: work.zone.name,
    "ชื่อเครื่องจักร": work.machineName,
    "ปัญหา": work.problemTitle,
    "ความเร่งด่วน": urgencyLabels[work.urgency as Urgency] ?? work.urgency,
    "สถานะ": statusLabels[work.status as WorkStatus] ?? work.status,
    "ผู้รับงาน": work.claimant?.fullName ?? "",
    "ผู้ตรวจรับ": work.reviewer?.fullName ?? "",
  };
}
