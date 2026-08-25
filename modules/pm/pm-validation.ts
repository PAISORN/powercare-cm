export function normalizePmGroupCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, "-");
  if (!normalized) throw new Error("PM Group code is required");
  return normalized;
}

export function normalizePmGroupName(value: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error("PM Group name is required");
  return normalized;
}

export function normalizePmGroupAssetIds(assetIds: readonly string[]) {
  const normalized = assetIds.map((id) => id.trim());
  if (normalized.some((id) => !id)) throw new Error("Asset ID is required");
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("An Asset may appear only once in a PM Group");
  }
  return normalized;
}
