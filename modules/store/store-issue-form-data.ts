export function parseStoreIssueFormData(formData: FormData) {
  const stockKeys = formData.getAll("stockKey").map(String);
  const zoneIds = formData.getAll("zoneId").map(String);
  const quantities = formData.getAll("requestedQty").map(Number);

  return {
    issueType: String(formData.get("issueType") ?? ""),
    cmWorkNumber: optionalText(formData.get("cmWorkNumber")),
    vehicle: optionalText(formData.get("vehicle")),
    odometerBefore: optionalNumber(formData.get("odometerBefore")),
    odometerAfter: optionalNumber(formData.get("odometerAfter")),
    dispenserMeterBefore: optionalNumber(formData.get("dispenserMeterBefore")),
    dispenserMeterAfter: optionalNumber(formData.get("dispenserMeterAfter")),
    note: optionalText(formData.get("note")),
    submissionKey: optionalText(formData.get("submissionKey")),
    items: stockKeys.map((stockKey, index) => {
      const [storeId, sparePartId] = stockKey.split(":");
      return {
        storeId,
        sparePartId,
        zoneId: zoneIds[index],
        requestedQty: quantities[index],
      };
    }),
  };
}

function optionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}
