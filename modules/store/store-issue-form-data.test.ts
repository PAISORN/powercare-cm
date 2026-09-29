import { describe, expect, it } from "vitest";
import { parseStoreIssueFormData } from "./store-issue-form-data";

describe("parseStoreIssueFormData", () => {
  it("parses shared issue fields and keeps line fields aligned by index", () => {
    const formData = new FormData();
    formData.set("issueType", "CM_REFERENCED");
    formData.set("cmWorkNumber", " CM-2026-09-0001 ");
    formData.set("note", " Replace both bearings ");
    formData.set("submissionKey", " request-1 ");
    formData.append("stockKey", "store-1:part-1");
    formData.append("stockKey", "store-2:part-2");
    formData.append("zoneId", "zone-1");
    formData.append("zoneId", "zone-2");
    formData.append("requestedQty", "2");
    formData.append("requestedQty", "3");

    expect(parseStoreIssueFormData(formData)).toMatchObject({
      issueType: "CM_REFERENCED",
      cmWorkNumber: "CM-2026-09-0001",
      note: "Replace both bearings",
      submissionKey: "request-1",
      items: [
        {
          storeId: "store-1",
          sparePartId: "part-1",
          zoneId: "zone-1",
          requestedQty: 2,
        },
        {
          storeId: "store-2",
          sparePartId: "part-2",
          zoneId: "zone-2",
          requestedQty: 3,
        },
      ],
    });
  });

  it("normalizes optional vehicle and meter values", () => {
    const formData = new FormData();
    formData.set("vehicle", " Truck 7 ");
    formData.set("odometerBefore", "100.25");
    formData.set("odometerAfter", "invalid");
    formData.set("dispenserMeterBefore", "");
    formData.set("dispenserMeterAfter", "240.5");

    expect(parseStoreIssueFormData(formData)).toMatchObject({
      vehicle: "Truck 7",
      odometerBefore: 100.25,
      odometerAfter: null,
      dispenserMeterBefore: null,
      dispenserMeterAfter: 240.5,
      note: null,
      cmWorkNumber: null,
    });
  });
});
