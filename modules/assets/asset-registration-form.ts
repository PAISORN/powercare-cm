import type { RegisteredAssetInput } from "./asset-service";

export type AssetRegistrationFormContext = {
  plantId: string;
  code?: string | null;
  metadataJson?: string | null;
};

export function registeredAssetInputFromFormData(
  formData: FormData,
  context: AssetRegistrationFormContext,
): RegisteredAssetInput {
  return {
    plantId: context.plantId,
    code: context.code ?? undefined,
    systemId: requiredAssetFormText(formData, "systemId"),
    assetTypeId: requiredAssetFormText(formData, "assetTypeId"),
    assetLevel: requiredAssetFormText(formData, "assetLevel"),
    parentId: optionalAssetFormText(formData, "parentId"),
    familyId: optionalAssetFormText(formData, "familyId"),
    assetClassId: optionalAssetFormText(formData, "assetClassId"),
    zoneId: optionalAssetFormText(formData, "zoneId"),
    nameTh: String(
      formData.get("nameTh") || formData.get("nameEn") || "",
    ).trim(),
    nameEn: optionalAssetFormText(formData, "nameEn"),
    discipline: optionalAssetFormText(formData, "discipline"),
    tagKks: optionalAssetFormText(formData, "tagKks"),
    registrationCode: optionalAssetFormText(formData, "registrationCode"),
    keySpecification: optionalAssetFormText(formData, "keySpecification"),
    metadataJson: context.metadataJson,
    installationLocation: optionalAssetFormText(
      formData,
      "installationLocation",
    ),
    manufacturer: optionalAssetFormText(formData, "manufacturer"),
    model: optionalAssetFormText(formData, "model"),
    serialNumber: optionalAssetFormText(formData, "serialNumber"),
    installedAt: assetFormDate(formData, "installedAt"),
    commissionedAt: assetFormDate(formData, "commissionedAt"),
    operatingStatus: requiredAssetFormText(formData, "operatingStatus"),
    criticality: requiredAssetFormText(formData, "criticality"),
  };
}

export function technicalValuesFromFormData(formData: FormData) {
  return Object.fromEntries(
    [...formData.entries()]
      .filter(([key]) => key.startsWith("tech_"))
      .map(([key, value]) => [key.slice(5), String(value)]),
  );
}

export function assetFormDateValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function assetFormDate(formData: FormData, name: string) {
  const value = String(formData.get(name) || "");
  return value ? new Date(`${value}T00:00:00+07:00`) : null;
}

function optionalAssetFormText(formData: FormData, key: string) {
  return requiredAssetFormText(formData, key) || null;
}

function requiredAssetFormText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}
