import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PublicLanding } from "../components/landing/public-landing";
import { db } from "../lib/db";
import { getCurrentUser } from "../lib/session";
import { listPublicAnnouncements } from "../modules/announcements/announcement-service";

export const metadata: Metadata = {
  title: "PowerCare | CMMS สำหรับงานซ่อมบำรุง",
  description: "แพลตฟอร์มบริหารงานซ่อมบำรุง CM และคลังอะไหล่ สำหรับหลายองค์กรและหลาย Site",
};

type LandingSearchParams = { feedback?: string };

async function submitPlatformFeedback(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !message) redirect("/?feedback=error#feedback");

  await db.publicFeedback.create({
    data: {
      organizationId: null,
      plantId: null,
      name: name.slice(0, 120),
      department: department ? department.slice(0, 120) : null,
      message: message.slice(0, 1500),
      sourcePath: "/",
    },
  });

  redirect("/?feedback=success#feedback");
}

export default async function LandingPage({ searchParams }: { searchParams: Promise<LandingSearchParams> }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const [params, announcements] = await Promise.all([searchParams, listPublicAnnouncements()]);

  return (
    <PublicLanding
      announcements={announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        publishStart: announcement.publishStart,
        publishEnd: announcement.publishEnd,
        pinned: announcement.pinned,
        isNew: announcement.isNew,
        imageStoragePath: announcement.imageStoragePath,
        authorName: announcement.author.fullName,
      }))}
      feedbackAction={submitPlatformFeedback}
      feedbackStatus={params.feedback}
    />
  );
}
