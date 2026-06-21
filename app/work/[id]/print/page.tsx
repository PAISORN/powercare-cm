import { notFound } from "next/navigation";
import { CompletionDocument } from "../../../../components/completion-document";
import { formatThaiDateTime } from "../../../../lib/date-time/bangkok-time";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/session";
import { canRenderCompletionDocument } from "../../../../modules/documents/completion-document";
import { readOrganizationProfile } from "../../../../modules/organization/organization-service";

export default async function PrintCompletionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [work, organization] = await Promise.all([
    db.cmWork.findUnique({
      where: { id },
      include: {
        category: true,
        zone: true,
        claimant: { include: { signature: true } },
        reviewer: { include: { signature: true } },
      },
    }),
    readOrganizationProfile(),
  ]);

  if (!work || !canRenderCompletionDocument(work.status)) notFound();

  return (
    <CompletionDocument
      organization={{
        companyName: organization.companyName,
        logoUrl: organization.hasLogo ? "/organization-logo" : null,
      }}
      work={{
        number: work.number,
        status: "ปิดงานแล้ว",
        createdAt: formatThaiDateTime(work.createdAt),
        claimedAt: work.claimedAt ? formatThaiDateTime(work.claimedAt) : "-",
        closedAt: work.closedAt ? formatThaiDateTime(work.closedAt) : "-",
        requesterName: work.requesterName,
        requesterDepartment: work.requesterDepartment,
        categoryName: work.category.name,
        zoneName: work.zone.name,
        machineName: work.machineName,
        problemTitle: work.problemTitle,
        problemDetail: work.problemDetail,
        rootCause: work.rootCause ?? "-",
        correctiveAction: work.correctiveAction ?? "-",
        engineerNote: work.engineerNote ?? "-",
        claimant: work.claimant
          ? {
              fullName: work.claimant.fullName,
              signatureUrl: work.claimant.signature
                ? `/signatures/${work.claimant.id}?v=${work.claimant.signature.uploadedAt.getTime()}`
                : null,
            }
          : null,
        reviewer: work.reviewer
          ? {
              fullName: work.reviewer.fullName,
              signatureUrl: work.reviewer.signature
                ? `/signatures/${work.reviewer.id}?v=${work.reviewer.signature.uploadedAt.getTime()}`
                : null,
            }
          : null,
      }}
    />
  );
}
