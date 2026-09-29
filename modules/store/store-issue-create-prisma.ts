import type { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { PermissionKey } from "../auth/site-admin-permissions";
import {
  createStoreIssueWithRepository,
  type StoreIssueItemInput,
} from "./store-issue-service";
import {
  formatSparePartIssueNumber,
  getStoreIssuePeriod,
} from "./store-numbering";
import {
  assertActorStoreScope,
  requireStorePermission,
} from "./store-authorization";
import { StoreIssueType, type StoreScope } from "./store-types";
import {
  assertStoreIssueItemsInScope,
  resolveStoreIssueCmWorkId,
} from "./store-issue-create-validation-prisma";
import { reserveStoreIssueLineNumbers } from "./store-issue-line-numbering-prisma";
import {
  optionalNumber,
  optionalText,
  requiredText,
} from "./store-issue-values";
import { isStoreIssueSubmissionConflict } from "./store-issue-idempotency";
import { dispatchStoreIssueLineEvent } from "./store-issue-line-events";
import { createIssueRepository } from "./store-issue-repository-prisma";
import {
  type StoreIssuePrismaActor,
  writeStoreIssueAudit,
} from "./store-issue-prisma-shared";

export type CreateLoggedInStoreIssueInput = {
  submissionKey?: string | null;
  issueType: string;
  cmWorkNumber?: string | null;
  requesterName: string;
  requesterDepartment?: string | null;
  requesterContact?: string | null;
  vehicle?: string | null;
  odometerBefore?: number | null;
  odometerAfter?: number | null;
  dispenserMeterBefore?: number | null;
  dispenserMeterAfter?: number | null;
  note?: string | null;
  requestedAt: Date;
  items: StoreIssueItemInput[];
};

export async function createLoggedInStoreIssue(
  actor: StoreIssuePrismaActor,
  scope: StoreScope,
  input: CreateLoggedInStoreIssueInput,
) {
  requireStorePermission(actor, PermissionKey.CREATE_STORE_ISSUE);
  assertActorStoreScope(actor, scope);
  const issueType = normalizeIssueType(input.issueType);

  const created = await runCreateStoreIssue({
    input,
    issueType,
    eventActorName: actor.fullName,
    resolveContext: async (tx) => {
      const plant = await tx.plant.findFirstOrThrow({
        where: {
          id: scope.plantId,
          organizationId: scope.organizationId,
          active: true,
        },
        select: { inventoryCode: true },
      });
      if (!plant.inventoryCode) {
        throw new Error(
          "Store Site code must be configured before creating an issue.",
        );
      }
      return {
        scope,
        inventoryCode: plant.inventoryCode,
        requesterName: requiredText(input.requesterName, "Requester name"),
        requesterDepartment: optionalText(
          input.requesterDepartment ?? actor.department,
        ),
        requesterContact: optionalText(input.requesterContact),
        requesterUserId: actor.id,
        auditActorId: actor.id,
        auditAction: "CREATE_STORE_ISSUE",
      };
    },
    recoverConflict: async (submissionKey) => {
      const existing = await findIssueBySubmissionKey(
        submissionKey,
        scope.plantId,
      );
      return existing ? { ...existing, plantId: scope.plantId } : null;
    },
  });

  const { plantId: _plantId, ...result } = created;
  return result;
}

export async function createPublicStoreIssue(
  inventoryCode: string,
  input: Omit<CreateLoggedInStoreIssueInput, "requesterName"> & {
    requesterName: string;
    requesterDepartment: string;
    requesterContact?: string | null;
  },
) {
  const normalizedInventoryCode = inventoryCode.trim().toUpperCase();
  return runCreateStoreIssue({
    input,
    eventActorName: input.requesterName,
    resolveContext: async (tx) => {
      const plant = await tx.plant.findFirst({
        where: {
          inventoryCode: normalizedInventoryCode,
          active: true,
          publicStoreIssueEnabled: true,
        },
        select: { id: true, organizationId: true, inventoryCode: true },
      });
      if (!plant?.inventoryCode) {
        throw new Error("Public Store Issue is not available for this Site.");
      }
      return {
        scope: {
          organizationId: plant.organizationId,
          plantId: plant.id,
          plantCode: plant.inventoryCode,
        },
        inventoryCode: plant.inventoryCode,
        requesterName: requiredText(input.requesterName, "Requester name"),
        requesterDepartment: requiredText(
          input.requesterDepartment,
          "Requester department",
        ),
        requesterContact: optionalText(input.requesterContact),
        requesterUserId: null,
        auditActorId: undefined,
        auditAction: "CREATE_PUBLIC_STORE_ISSUE",
      };
    },
    recoverConflict: async (submissionKey) => {
      const plant = await db.plant.findFirst({
        where: {
          inventoryCode: normalizedInventoryCode,
          active: true,
          publicStoreIssueEnabled: true,
        },
        select: { id: true },
      });
      if (!plant) return null;
      const existing = await findIssueBySubmissionKey(submissionKey, plant.id);
      return existing ? { ...existing, plantId: plant.id } : null;
    },
  });
}

type CreateStoreIssueContext = {
  scope: StoreScope;
  inventoryCode: string;
  requesterName: string;
  requesterDepartment: string | null;
  requesterContact: string | null;
  requesterUserId: string | null;
  auditActorId: string | undefined;
  auditAction: "CREATE_STORE_ISSUE" | "CREATE_PUBLIC_STORE_ISSUE";
};

type CreateStoreIssueResult = {
  id: string;
  number: string;
  plantId: string;
};

async function runCreateStoreIssue(config: {
  input: CreateLoggedInStoreIssueInput;
  issueType?: StoreIssueType;
  eventActorName?: string | null;
  resolveContext: (
    tx: Prisma.TransactionClient,
  ) => Promise<CreateStoreIssueContext>;
  recoverConflict: (
    submissionKey: string,
  ) => Promise<CreateStoreIssueResult | null>;
}): Promise<CreateStoreIssueResult> {
  const { input } = config;
  const submissionKey = optionalText(input.submissionKey);

  let created;
  try {
    created = await db.$transaction(async (tx) => {
      const context = await config.resolveContext(tx);
      const { scope } = context;
      const issueType = config.issueType ?? normalizeIssueType(input.issueType);
      if (submissionKey) {
        const existing = await tx.sparePartIssue.findUnique({
          where: { submissionKey },
          select: { id: true, number: true, plantId: true },
        });
        if (existing) {
          if (existing.plantId !== scope.plantId)
            throw new Error("Invalid issue submission.");
          return { ...existing, wasExisting: true };
        }
      }

      const cmWorkId = await resolveStoreIssueCmWorkId(
        tx,
        scope,
        issueType,
        input.cmWorkNumber,
      );
      const itemKind = await assertStoreIssueItemsInScope(
        tx,
        scope,
        input.items,
      );
      const items = await reserveStoreIssueLineNumbers(
        tx,
        scope,
        context.inventoryCode,
        input.items,
      );
      const { year, month } = getStoreIssuePeriod(input.requestedAt);
      const sequence = await tx.storeIssueSequence.upsert({
        where: { plantId_year_month: { plantId: scope.plantId, year, month } },
        update: { lastNumber: { increment: 1 } },
        create: { plantId: scope.plantId, year, month, lastNumber: 1 },
        select: { lastNumber: true },
      });
      const number = formatSparePartIssueNumber(
        context.inventoryCode,
        input.requestedAt,
        sequence.lastNumber,
      );
      const repository = createIssueRepository(tx);
      const issue = await createStoreIssueWithRepository(repository, scope, {
        number,
        submissionKey,
        issueType,
        cmWorkId,
        requesterName: context.requesterName,
        requesterDepartment: context.requesterDepartment,
        requesterContact: context.requesterContact,
        vehicle: optionalText(input.vehicle),
        odometerBefore: optionalNumber(input.odometerBefore),
        odometerAfter: optionalNumber(input.odometerAfter),
        dispenserMeterBefore: optionalNumber(input.dispenserMeterBefore),
        dispenserMeterAfter: optionalNumber(input.dispenserMeterAfter),
        requesterUserId: context.requesterUserId,
        note: optionalText(input.note),
        requestedAt: input.requestedAt,
        items,
      });
      await tx.sparePartIssue.update({
        where: { id: issue.id },
        data: { itemKind },
      });
      await writeStoreIssueAudit(
        tx,
        context.auditActorId,
        scope,
        issue.id,
        context.auditAction,
        { number, issueType, itemCount: input.items.length },
      );
      return { ...issue, number, plantId: scope.plantId, wasExisting: false };
    });
  } catch (error) {
    if (submissionKey && isStoreIssueSubmissionConflict(error)) {
      const existing = await config.recoverConflict(submissionKey);
      if (existing) return existing;
    }
    throw error;
  }

  if (!created.wasExisting) {
    await dispatchStoreIssueLineEvent(
      created.id,
      "STORE_ISSUE_CREATED",
      config.eventActorName,
    );
  }
  const { wasExisting: _wasExisting, ...result } = created;
  return result;
}

async function findIssueBySubmissionKey(
  submissionKey: string,
  plantId: string,
) {
  const existing = await db.sparePartIssue.findUnique({
    where: { submissionKey },
    select: { id: true, number: true, plantId: true },
  });
  if (!existing || existing.plantId !== plantId) return null;
  return { id: existing.id, number: existing.number };
}

function normalizeIssueType(value: string): StoreIssueType {
  if (value === StoreIssueType.CM_REFERENCED || value === StoreIssueType.DIRECT)
    return value;
  throw new Error("Store issue type is invalid.");
}
