export function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

export function optionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

export function optionalNumber(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return value;
}
