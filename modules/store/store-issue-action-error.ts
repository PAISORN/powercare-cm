const safeStoreIssueErrorFragments = [
  "required",
  "must",
  "cannot",
  "not found",
  "not available",
  "outside",
  "exceeds",
  "Not enough stock",
  "invalid",
  "permission",
  "No approval scope",
  "No issue scope",
  "waiting for Store action",
  "At least one",
  "only one inventory type",
  "requires separate users",
  "Store Site code",
  "Public Store Issue",
];

export function storeIssueActionError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return safeStoreIssueErrorFragments.some((fragment) =>
    error.message.includes(fragment),
  )
    ? error.message
    : fallback;
}
