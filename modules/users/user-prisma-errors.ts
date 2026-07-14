export function isDuplicateUsernameError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  const target = (error as { meta?: { target?: unknown } }).meta?.target;

  if (code !== "P2002") return false;
  if (Array.isArray(target)) return target.includes("username");
  return target === "username";
}
