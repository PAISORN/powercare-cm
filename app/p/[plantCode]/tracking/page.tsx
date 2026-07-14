import { TrackingPageContent } from "../../../tracking/page";

export default async function PlantTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ plantCode: string }>;
  searchParams: Promise<{ number?: string }>;
}) {
  const { plantCode } = await params;
  const { number } = await searchParams;
  return <TrackingPageContent number={number} plantCode={plantCode} />;
}
