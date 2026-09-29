import { redirect } from "next/navigation";

export default async function SiteAdminPermissionsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string; plantId?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams({ mode: "user" });
  if (query.organizationId) params.set("organizationId", query.organizationId);
  if (query.plantId) params.set("plantId", query.plantId);
  redirect(`/admin/permissions?${params.toString()}`);
}
