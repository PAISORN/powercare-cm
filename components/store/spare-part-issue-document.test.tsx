import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SparePartIssueDocument, type SparePartIssueDocumentProps } from "./spare-part-issue-document";

const props: SparePartIssueDocumentProps = {
  branding: {
    companyName: "PowerCare.CM",
    organizationName: "Organization A",
    siteName: "Site A",
    address: "Bangkok",
  },
  issue: {
    number: "SI-RTB-2026-07-0001",
    issueType: "ดำเนินงาน CM",
    requestedAt: "15/07/2569 08:00 น.",
    issuedAt: "15/07/2569 09:00 น.",
    requesterName: "Requester",
    requesterDepartment: "Maintenance",
    cmNumber: "CM-2026-07-0001",
    requester: { fullName: "Requester", signedAt: "15/07/2569" },
    engineer: { fullName: "Engineer", signedAt: "15/07/2569" },
    storeOfficer: { fullName: "Store Officer", signedAt: "15/07/2569" },
  },
  items: [{
    lineCode: "SP01-RTB-630101-EI-02-FUSE001",
    itemCode: "FUSE001",
    name: "Fuse",
    storeName: "SP01 - Store 1",
    zoneCode: "02",
    unit: "PCS",
    requestedQty: 2,
    approvedQty: 2,
    issuedQty: 2,
    unitPrice: 50,
    issuedValue: 100,
  }],
  printedAt: "15/07/2569 09:01 น.",
  printedBy: "Owner Admin",
};

describe("SparePartIssueDocument", () => {
  it("renders formal issue details, line code, totals, and three signers", () => {
    const markup = renderToStaticMarkup(<SparePartIssueDocument {...props} />);

    expect(markup).toContain("ใบเบิกและจ่ายอะไหล่");
    expect(markup).toContain("SPARE PART ISSUE DOCUMENT");
    expect(markup).toContain("SP01-RTB-630101-EI-02-FUSE001");
    expect(markup).toContain("ผู้ขอเบิก (Requester)");
    expect(markup).toContain("วิศวกรผู้อนุมัติ (Engineer)");
    expect(markup).toContain("ผู้จ่ายอะไหล่ (Store Officer)");
    expect(markup).toContain("100.00 บาท");
    expect(markup).toContain("PC-INV-ISS-001 | Rev.00");
    expect(markup).toContain("size: A4 landscape");
  });
});
