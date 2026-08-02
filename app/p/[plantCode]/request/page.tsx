import { RequestPageContent } from "../../../request/page";

export const dynamic = "force-dynamic";

export default async function PlantRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ plantCode: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { plantCode } = await params;
  const query = await searchParams;
  return <RequestPageContent error={query?.error ?? null} plantCode={plantCode} />;
}
