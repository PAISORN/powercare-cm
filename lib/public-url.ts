type PublicUrlInput = {
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  host?: string | null;
  origin?: string | null;
  vercelUrl?: string | null;
};

export function getPublicBaseUrl(input: PublicUrlInput) {
  if (input.origin && input.origin !== "null") return input.origin.replace(/\/$/, "");

  const host = firstHeaderValue(input.forwardedHost) ?? firstHeaderValue(input.host) ?? input.vercelUrl;
  if (!host) return "http://localhost:3000";

  const protocol =
    firstHeaderValue(input.forwardedProto) ??
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${protocol.replace(/:$/, "")}://${host.replace(/\/$/, "")}`;
}

export function getGeneralRequestUrl(input: PublicUrlInput) {
  return new URL("/request", getPublicBaseUrl(input)).toString();
}

export function getPlantRequestUrl(input: PublicUrlInput, plantCode: string) {
  return new URL(`/p/${encodeURIComponent(plantCode)}/request`, getPublicBaseUrl(input)).toString();
}

export function getPlantStoreIssueUrl(input: PublicUrlInput, inventoryCode: string) {
  return new URL(`/p/${encodeURIComponent(inventoryCode.toLowerCase())}/store/issue`, getPublicBaseUrl(input)).toString();
}

function firstHeaderValue(value?: string | null) {
  return value?.split(",")[0]?.trim() || undefined;
}
