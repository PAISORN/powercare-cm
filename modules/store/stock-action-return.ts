export type StockActionScope = {
  organizationId: string;
  plantId: string;
};

export function safeStockReturnTo(
  scope: StockActionScope,
  requestedReturnTo: FormDataEntryValue | null,
  keepHash = true,
) {
  const scopedPrefix = `/dashboardstore/stock?organizationId=${encodeURIComponent(scope.organizationId)}&plantId=${encodeURIComponent(scope.plantId)}`;
  const requested = String(requestedReturnTo ?? "");
  let safeReturnTo = scopedPrefix;
  try {
    const parsed = new URL(requested, "https://powercare.local");
    if (
      requested.startsWith("/dashboardstore/stock?") &&
      parsed.origin === "https://powercare.local" &&
      parsed.pathname === "/dashboardstore/stock" &&
      parsed.searchParams.get("organizationId") === scope.organizationId &&
      parsed.searchParams.get("plantId") === scope.plantId
    ) {
      safeReturnTo = requested;
    }
  } catch {
    safeReturnTo = scopedPrefix;
  }
  return keepHash ? safeReturnTo : safeReturnTo.split("#", 1)[0];
}

export function stockHrefWithFeedback(
  returnTo: string,
  key: string,
  value: string,
) {
  const [returnPath, returnHash] = returnTo.split("#", 2);
  return `${returnPath}${returnPath.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}${returnHash ? `#${returnHash}` : ""}`;
}
