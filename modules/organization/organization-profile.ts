export const ORGANIZATION_PROFILE_ID = "primary";

export const organizationFallback = {
  id: ORGANIZATION_PROFILE_ID,
  companyName: "PowerCare.CM",
  logoFileName: null,
  logoMimeType: null,
  logoFileSize: null,
  logoStoragePath: null,
  hasLogo: false,
};

export function normalizeOrganizationInput(input: { companyName: string }) {
  const companyName = input.companyName.trim();
  if (!companyName) throw new Error("Company name is required");
  if (companyName.length > 200) throw new Error("Company name is too long");
  return { companyName };
}
