export type IssueActionScope = {
  organizationId: string;
  plantId: string;
};

export function safeIssueReturnTo(
  scope: IssueActionScope,
  requestedReturnTo: FormDataEntryValue | null,
) {
  const scopedParams = new URLSearchParams({
    organizationId: scope.organizationId,
    plantId: scope.plantId,
    view: "tracking",
  });
  const scopedHref = `/dashboardstore/issue?${scopedParams.toString()}`;
  const requested = String(requestedReturnTo ?? "");

  try {
    const parsed = new URL(requested, "https://powercare.local");
    if (
      requested.startsWith("/dashboardstore/issue?") &&
      parsed.origin === "https://powercare.local" &&
      parsed.pathname === "/dashboardstore/issue" &&
      parsed.searchParams.get("organizationId") === scope.organizationId &&
      parsed.searchParams.get("plantId") === scope.plantId &&
      parsed.searchParams.get("view") === "tracking"
    ) {
      return requested;
    }
  } catch {
    return scopedHref;
  }

  return scopedHref;
}

export function issueHrefWithFeedback(
  returnTo: string,
  key: "saved" | "error",
  value: string,
) {
  const [returnPath, returnHash] = returnTo.split("#", 2);
  return `${returnPath}${returnPath.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}${returnHash ? `#${returnHash}` : ""}`;
}
