import { Prisma } from "@prisma/client";

export function requiredText(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

export function normalizeMasterCode(value: string, label: string) {
  const normalized = requiredText(value, label).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._/-]*$/.test(normalized)) {
    throw new Error(
      `${label} may contain letters, numbers, dot, underscore, slash, or hyphen only.`,
    );
  }
  return normalized;
}

export function optionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

export function isStoreUniqueConstraint(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
