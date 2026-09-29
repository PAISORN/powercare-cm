import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import type { StoreScope } from "./store-types";

type StoreScopeIdentity = Pick<StoreScope, "organizationId" | "plantId">;

export type StoreMutationAudit = {
  entityType: string;
  entityId: string;
  action: string;
  after: Record<string, unknown>;
};

type StoreMutationResult<T> = {
  value: T;
  audit: StoreMutationAudit;
};

export async function runStoreMutation<T>(
  actorId: string,
  scope: StoreScopeIdentity,
  mutate: (tx: Prisma.TransactionClient) => Promise<StoreMutationResult<T>>,
) {
  return db.$transaction(async (tx) => {
    await tx.plant.findFirstOrThrow({
      where: {
        id: scope.plantId,
        organizationId: scope.organizationId,
        active: true,
      },
      select: { id: true },
    });

    const { value, audit } = await mutate(tx);
    await tx.auditEvent.create({
      data: {
        actorId,
        organizationId: scope.organizationId,
        plantId: scope.plantId,
        entityType: audit.entityType,
        entityId: audit.entityId,
        action: audit.action,
        afterJson: JSON.stringify(audit.after),
      },
    });
    return value;
  });
}
