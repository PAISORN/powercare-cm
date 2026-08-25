export function isAuthorizedCronRequest(request: Request, environment: NodeJS.ProcessEnv = process.env) {
  const secret = environment.CRON_SECRET?.trim();
  if (!secret) return environment.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
