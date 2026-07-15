import { notFound } from "next/navigation";
import { IssueDocumentPrintButton } from "../../../../../components/store/issue-document-print-button";
import { SparePartIssueDocument } from "../../../../../components/store/spare-part-issue-document";
import { formatThaiDateTime } from "../../../../../lib/date-time/bangkok-time";
import { db } from "../../../../../lib/db";
import { requireUser } from "../../../../../lib/session";
import { readOrganizationProfile } from "../../../../../modules/organization/organization-service";
import { readPlantProfile } from "../../../../../modules/organization/plant-profile-service";
import { canPrintSparePartIssueDocument } from "../../../../../modules/store/store-issue-print-permission";
import { StoreIssueType } from "../../../../../modules/store/store-types";

export default async function PrintSparePartIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const issue = await db.sparePartIssue.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
      plant: { select: { id: true, name: true } },
      cmWork: { select: { number: true, machineName: true, problemTitle: true } },
      requesterUser: { select: { id: true, fullName: true, department: true, signature: true } },
      engineer: { select: { id: true, fullName: true, signature: true } },
      storeOfficer: { select: { id: true, fullName: true, signature: true } },
      items: {
        include: {
          store: { select: { code: true, name: true } },
          sparePart: {
            select: {
              code: true,
              itemCode: true,
              name: true,
              description: true,
              unit: true,
              category: { select: { code: true } },
              type: { select: { code: true } },
            },
          },
          zone: { select: { name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!issue || !canPrintSparePartIssueDocument(user, issue)) notFound();

  const [plantProfile, organizationProfile] = await Promise.all([
    readPlantProfile(issue.plantId),
    readOrganizationProfile(issue.organizationId),
  ]);
  const logoUrl = plantProfile.hasLogo
    ? `/organization-logo?plantId=${encodeURIComponent(issue.plantId)}`
    : organizationProfile.hasLogo
      ? `/organization-logo?organizationId=${encodeURIComponent(issue.organizationId)}`
      : null;
  const companyName = plantProfile.companyName?.trim() || organizationProfile.companyName || "PowerCare.CM";
  const requesterSignatureUrl = signatureUrl(issue.requesterUser);
  const engineerSignatureUrl = signatureUrl(issue.engineer);
  const storeOfficerSignatureUrl = signatureUrl(issue.storeOfficer);
  const missingSignatures = [
    !engineerSignatureUrl ? "วิศวกรผู้อนุมัติ" : null,
    !storeOfficerSignatureUrl ? "เจ้าหน้าที่คลังอะไหล่" : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="min-h-screen bg-slate-100 py-5 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[297mm] items-center justify-between gap-4 px-4 print:hidden">
        <div>
          <p className="font-bold text-slate-900">เอกสารใบเบิกและจ่ายอะไหล่</p>
          <p className="text-sm text-slate-600">{issue.number}</p>
        </div>
        <IssueDocumentPrintButton missingSignatures={missingSignatures} />
      </div>
      <SparePartIssueDocument
        branding={{
          companyName,
          organizationName: issue.organization.name,
          siteName: issue.plant.name,
          address: plantProfile.address,
          logoUrl,
        }}
        issue={{
          number: issue.number,
          issueType: issue.issueType === StoreIssueType.CM_REFERENCED ? "ดำเนินงาน CM" : "เบิกโดยตรง",
          requestedAt: formatThaiDateTime(issue.requestedAt),
          issuedAt: issue.issuedAt ? formatThaiDateTime(issue.issuedAt) : "-",
          requesterName: issue.requesterUser?.fullName ?? issue.requesterName,
          requesterDepartment: issue.requesterUser?.department ?? issue.requesterDepartment ?? "-",
          requesterContact: issue.requesterContact,
          note: issue.note,
          cmNumber: issue.cmWork?.number,
          machineName: issue.cmWork?.machineName,
          problemTitle: issue.cmWork?.problemTitle,
          requester: {
            fullName: issue.requesterUser?.fullName ?? issue.requesterName,
            signatureUrl: requesterSignatureUrl,
            signedAt: formatThaiDateTime(issue.requestedAt),
          },
          engineer: {
            fullName: issue.engineer?.fullName ?? "ยังไม่ระบุ",
            signatureUrl: engineerSignatureUrl,
            signedAt: issue.engineerApprovedAt ? formatThaiDateTime(issue.engineerApprovedAt) : "-",
          },
          storeOfficer: {
            fullName: issue.storeOfficer?.fullName ?? "ยังไม่ระบุ",
            signatureUrl: storeOfficerSignatureUrl,
            signedAt: issue.issuedAt ? formatThaiDateTime(issue.issuedAt) : "-",
          },
        }}
        items={issue.items.map((item) => {
          const issuedQty = Number(item.issuedQty ?? 0);
          const unitPrice = Number(item.unitPrice ?? 0);
          return {
            lineCode: item.lineNumber || buildFallbackLineCode(item),
            itemCode: item.sparePart.itemCode || item.sparePart.code,
            name: item.sparePart.name,
            description: item.sparePart.description,
            storeName: item.store ? `${item.store.code} - ${item.store.name}` : "-",
            zoneCode: item.zoneCode || "-",
            zoneName: item.zone?.name,
            unit: item.sparePart.unit,
            requestedQty: Number(item.requestedQty),
            approvedQty: Number(item.approvedQty ?? item.requestedQty),
            issuedQty,
            unitPrice,
            issuedValue: issuedQty * unitPrice,
            note: item.note,
          };
        })}
        printedAt={formatThaiDateTime(new Date())}
        printedBy={user.fullName}
      />
    </div>
  );
}

type SignatureUser = {
  id: string;
  signature: { uploadedAt: Date } | null;
} | null;

function signatureUrl(user: SignatureUser) {
  return user?.signature ? `/signatures/${user.id}?v=${user.signature.uploadedAt.getTime()}` : null;
}

function buildFallbackLineCode(item: {
  store: { code: string } | null;
  sparePart: {
    code: string;
    itemCode: string | null;
    type: { code: string } | null;
    category: { code: string | null } | null;
  };
  zoneCode: string | null;
}) {
  const typeCode = item.sparePart.type?.code?.replace(/^GL/i, "") || "NA";
  return [
    item.store?.code || "STORE",
    "RTB",
    typeCode,
    item.sparePart.category?.code || "NA",
    item.zoneCode || "NA",
    item.sparePart.itemCode || item.sparePart.code,
  ].join("-");
}
