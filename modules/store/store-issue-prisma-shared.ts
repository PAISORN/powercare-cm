import type { Prisma } from "@prisma/client";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import type { StoreScope } from "./store-types";

export type StoreIssuePrismaActor = PermissionUserContext & {
  id: string;
  fullName?: string;
  department?: string | null;
  inventoryScopes?: Array<{
    itemKind: string;
    responsibilityEnabled: boolean;
    approvalEnabled: boolean;
  }>;
};

export async function writeStoreIssueAudit(
  tx: Prisma.TransactionClient,
  actorId: string | undefined,
  scope: StoreScope,
  issueId: string,
  action: string,
  after: unknown,
) {
  await tx.auditEvent.create({
    data: {
      actorId,
      organizationId: scope.organizationId,
      plantId: scope.plantId,
      entityType: "SparePartIssue",
      entityId: issueId,
      action,
      afterJson: JSON.stringify(after),
    },
  });
}
