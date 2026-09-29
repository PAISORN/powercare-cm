export function isStoreIssueSubmissionConflict(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") {
    return false;
  }
  const meta = "meta" in error && error.meta && typeof error.meta === "object"
    ? error.meta as { target?: unknown }
    : undefined;
  const target = meta?.target;
  return Array.isArray(target)
    ? target.some((field) => String(field).includes("submissionKey"))
    : String(target ?? "").includes("submissionKey");
}
