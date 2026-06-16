import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { createCmWorkWorkbook } from "../../../lib/excel";
import { getCurrentUser } from "../../../lib/session";
import { RoleName, statusLabels, urgencyLabels, type Urgency, type WorkStatus } from "../../../modules/cm-work/cm-work-types";

export const preferredRegion = "home";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== RoleName.ADMIN && user.role !== RoleName.ENGINEER) return new NextResponse("Forbidden", { status: 403 });

  const works = await db.cmWork.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, zone: true, claimant: true },
  });

  const rows = works.map((work) => ({
    "เลขที่แจ้งซ่อม": work.number,
    "วันที่แจ้ง": work.createdAt.toISOString(),
    "ผู้แจ้ง": work.requesterName,
    "หน่วยงาน": work.requesterDepartment,
    Category: work.category.name,
    Zone: work.zone.name,
    "ชื่อเครื่องจักร": work.machineName,
    "หัวข้อปัญหา": work.problemTitle,
    "ความเร่งด่วน": urgencyLabels[work.urgency as Urgency] ?? work.urgency,
    "สถานะ": statusLabels[work.status as WorkStatus] ?? work.status,
    "ผู้รับงาน": work.claimant?.fullName ?? "",
  }));

  const workbook = createCmWorkWorkbook(rows);
  return new NextResponse(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="cm-work-export.xlsx"',
    },
  });
}
