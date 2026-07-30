import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompletionDocument, type CompletionDocumentProps } from "./completion-document";

const work: CompletionDocumentProps["work"] = {
  number: "CM-2026-06-0014",
  status: "ปิดงานแล้ว",
  createdAt: "17/6/2569 01:12:50",
  claimedAt: "17/6/2569 03:02:39",
  closedAt: "17/6/2569 06:57:59",
  requesterName: "ผู้แจ้งซ่อม",
  requesterDepartment: "Operations",
  categoryName: "งานไฟฟ้า",
  zoneName: "Water Treatment Plant",
  machineName: "ระบบแสงสว่าง",
  problemTitle: "เพิ่มแสงสว่างในห้องสารเคมี",
  problemDetail: "แสงสว่างไม่เพียงพอ",
  rootCause: "จำนวนโคมไฟไม่เพียงพอ",
  correctiveAction: "ติดตั้งโคมไฟเพิ่ม",
  engineerNote: "ใช้งานได้ปกติ",
  claimant: { fullName: "ช่างไฟฟ้า", signatureUrl: "/signatures/tech" },
  reviewer: { fullName: "วิศวกรไฟฟ้า", signatureUrl: "/signatures/engineer" },
};

describe("CompletionDocument", () => {
  it("places the organization logo before the document title and renders all sections", () => {
    const markup = renderToStaticMarkup(
      <CompletionDocument
        organization={{ companyName: "บริษัท รุ่งทิวา ไบโอแมส จำกัด", logoUrl: "/organization-logo" }}
        work={work}
      />,
    );

    expect(markup.indexOf("Company logo")).toBeLessThan(markup.indexOf("ใบสรุปปิดงาน Corrective Maintenance"));
    expect(markup).toContain("1. ข้อมูลงานซ่อม");
    expect(markup).toContain("2. รายละเอียดงานซ่อม");
    expect(markup).toContain("3. การดำเนินการแก้ไข");
    expect(markup).toContain("ผู้ดำเนินการ");
    expect(markup).toContain("ผู้ตรวจรับ");
  });

  it("renders the PowerCare fallback without an empty logo image", () => {
    const markup = renderToStaticMarkup(
      <CompletionDocument organization={{ companyName: "PowerCare.CM", logoUrl: null }} work={work} />,
    );
    expect(markup).toContain("PowerCare.CM");
    expect(markup).not.toContain("Company logo");
  });

  it("renders only actual inventory usage when the completion data includes issued items", () => {
    const markup = renderToStaticMarkup(
      <CompletionDocument
        organization={{ companyName: "PowerCare.CM" }}
        work={{
          ...work,
          inventoryUsage: [{
            issueNumber: "SI-RTB-2026-07-0001",
            itemKind: "OIL",
            code: "SP-RTB-00001",
            name: "Hydraulic Oil",
            quantity: "2",
            unit: "L",
            store: "MAIN · Main Store",
            issuedAt: "30/7/2569 10:00",
            note: "-",
          }],
        }}
      />,
    );
    expect(markup).toContain("SI-RTB-2026-07-0001");
    expect(markup).toContain("Hydraulic Oil");
    expect(markup).toContain("2 L");
  });
});
