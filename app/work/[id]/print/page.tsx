import { notFound } from "next/navigation";
import { CompletionDocument } from "../../../../components/completion-document";
import { formatThaiDateTime } from "../../../../lib/date-time/bangkok-time";
import { db } from "../../../../lib/db";
import { requireUser } from "../../../../lib/session";
import { canRenderCompletionDocument } from "../../../../modules/documents/completion-document";
import { readOrganizationProfile } from "../../../../modules/organization/organization-service";
import { readPlantProfile } from "../../../../modules/organization/plant-profile-service";
import { buildUserOperationalScope, type OperationalScope } from "../../../../modules/organization/user-plant-scope";

export default async function PrintCompletionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const scope = buildUserOperationalScope(user);
  const work = await db.cmWork.findFirst({
    where: { id, ...buildWorkScopeWhere(scope) },
    include: {
      category: true,
      zone: true,
      claimant: { include: { signature: true } },
      reviewer: { include: { signature: true } },
    },
  });

  if (!work || !canRenderCompletionDocument(work.status)) notFound();
  const organization = work.plantId ? await readPlantProfile(work.plantId) : await readOrganizationProfile(work.organizationId);
  const companyName = "displayName" in organization ? organization.displayName : organization.companyName;
  const logoUrl = organization.hasLogo
    ? "plantId" in organization
      ? `/organization-logo?plantId=${encodeURIComponent(organization.plantId)}`
      : `/organization-logo?organizationId=${encodeURIComponent(work.organizationId ?? "")}`
    : null;

  return (
    <CompletionDocument
      organization={{
        companyName,
        logoUrl,
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

function buildWorkScopeWhere(scope?: OperationalScope) {
  if (scope?.plantId) return { plantId: scope.plantId };
  if (scope?.organizationId) return { organizationId: scope.organizationId };
  return {};
}
