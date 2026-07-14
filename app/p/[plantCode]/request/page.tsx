import { RequestPageContent } from "../../../request/page";

export default async function PlantRequestPage({
  params,
}: {
  params: Promise<{ plantCode: string }>;
}) {
  const { plantCode } = await params;
  return <RequestPageContent plantCode={plantCode} />;
}
