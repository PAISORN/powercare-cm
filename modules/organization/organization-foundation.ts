export const DEFAULT_ORGANIZATION_ID = "primary";
export const DEFAULT_ORGANIZATION_SLUG = "primary";
export const DEFAULT_PLANT_ID = "primary-plant";
export const DEFAULT_PLANT_CODE = "main";

export const defaultOrganizationRecord = {
  id: DEFAULT_ORGANIZATION_ID,
  slug: DEFAULT_ORGANIZATION_SLUG,
  name: "Power Care.CM",
};

export const defaultPlantRecord = {
  id: DEFAULT_PLANT_ID,
  organizationId: DEFAULT_ORGANIZATION_ID,
  code: DEFAULT_PLANT_CODE,
  name: "Main Plant",
};

export function normalizeOrganizationRecordInput(input: { name: string; slug: string }) {
  const name = input.name.trim();
  const slug = normalizeScopeCode(input.slug);
  if (!name) throw new Error("Organization name is required");
  if (!slug) throw new Error("Organization slug is required");
  if (name.length > 200) throw new Error("Organization name is too long");
  return { name, slug };
}

export function normalizePlantRecordInput(input: { name: string; code: string }) {
  const name = input.name.trim();
  const code = normalizeScopeCode(input.code);
  if (!name) throw new Error("Plant name is required");
  if (!code) throw new Error("Plant code is required");
  if (name.length > 200) throw new Error("Plant name is too long");
  return { name, code };
}

function normalizeScopeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
