import { Prisma } from "@prisma/client";
import { db } from "../../lib/db";
import { canManagePmPlans } from "../auth/permission";
import type { PermissionUserContext } from "../auth/site-admin-permissions";
import { RoleName } from "../cm-work/cm-work-types";

export const PM_CHECK_SHEET_DATA_TYPES = [
  "TEXT",
  "NUMBER",
  "DATE",
  "BOOLEAN",
  "SELECT",
] as const;

export type PmCheckSheetDataType = (typeof PM_CHECK_SHEET_DATA_TYPES)[number];
export type PmCheckSheetItemSource = "DEFAULT" | "CUSTOM";

export type PmCheckSheetSnapshotItem = {
  id: string;
  source: PmCheckSheetItemSource;
  labelTh: string;
  labelEn: string | null;
  dataType: string;
  unit: string | null;
  optionsJson: string | null;
  helpText: string | null;
  indicatorText: string | null;
  required: boolean;
  sortOrder: number;
};

export type PmCheckSheetSnapshot = {
  version: 1;
  assetId: string;
  assetCode: string | null;
  assetName: string;
  assetTypeName: string | null;
  items: PmCheckSheetSnapshotItem[];
};

type Scope = { organizationId: string; plantId: string };
type CheckSheetDb = Pick<Prisma.TransactionClient, "asset">;

function actorId(actor: PermissionUserContext) {
  if (!actor.id) throw new Error("Authenticated user is required");
  return actor.id;
}

function authorize(actor: PermissionUserContext, scope: Scope) {
  if (!canManagePmPlans(actor)) throw new Error("You cannot manage PM Check Sheets");
  if (actor.role === RoleName.ADMIN) return;
  if (actor.organizationId !== scope.organizationId)
    throw new Error("PM Check Sheet scope is outside your Organization");
  if (actor.role !== RoleName.ORGANIZATION_ADMIN && actor.plantId !== scope.plantId)
    throw new Error("PM Check Sheet scope is outside your Site");
}

function normalizedItem(input: {
  labelTh: string;
  dataType: string;
  unit?: string | null;
  options?: string[] | string | null;
  helpText?: string | null;
  indicatorText?: string | null;
  required?: boolean;
}) {
  const labelTh = input.labelTh.trim();
  if (!labelTh || labelTh.length > 200) throw new Error("Checklist name is required and must not exceed 200 characters");
  if (!PM_CHECK_SHEET_DATA_TYPES.includes(input.dataType as PmCheckSheetDataType))
    throw new Error("Checklist data type is invalid");
  const dataType = input.dataType as PmCheckSheetDataType;
  let rawOptions: string[];
  if (Array.isArray(input.options)) rawOptions = input.options;
  else {
    const raw = String(input.options ?? "");
    try {
      const parsed = JSON.parse(raw) as unknown;
      rawOptions = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : raw.split(/\r?\n|,/);
    } catch {
      rawOptions = raw.split(/\r?\n|,/);
    }
  }
  const options = Array.from(new Set(rawOptions.map((item) => item.trim()).filter(Boolean)));
  if (options.length > 100 || options.some((item) => item.length > 200))
    throw new Error("Checklist options are invalid");
  if (dataType === "SELECT" && !options.length)
    throw new Error("Select checklist requires at least one option");
  return {
    labelTh,
    dataType,
    unit: input.unit?.trim().slice(0, 80) || null,
    optionsJson: dataType === "SELECT" ? JSON.stringify(options) : null,
    helpText: input.helpText?.trim().slice(0, 500) || null,
    indicatorText: input.indicatorText?.trim().slice(0, 500) || null,
    required: Boolean(input.required),
  };
}

export async function loadPmCheckSheetSnapshots(
  client: CheckSheetDb,
  assetIds: string[],
  options: { includeInactive?: boolean } = {},
) {
  const uniqueIds = Array.from(new Set(assetIds.filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, PmCheckSheetSnapshot>();
  const assets = await client.asset.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      code: true,
      nameTh: true,
      assetType: {
        select: {
          code: true,
          nameTh: true,
          fields: {
            where: options.includeInactive ? undefined : { active: true },
            orderBy: [{ sortOrder: "asc" }, { labelTh: "asc" }],
            select: {
              id: true,
              labelTh: true,
              labelEn: true,
              dataType: true,
              unit: true,
              optionsJson: true,
              helpText: true,
              indicatorText: true,
              required: true,
              sortOrder: true,
            },
          },
        },
      },
      pmCheckSheetItems: {
        where: options.includeInactive ? undefined : { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          labelTh: true,
          dataType: true,
          unit: true,
          optionsJson: true,
          helpText: true,
          indicatorText: true,
          required: true,
          sortOrder: true,
        },
      },
    },
  });
  return new Map(
    assets.map((asset) => [
      asset.id,
      {
        version: 1 as const,
        assetId: asset.id,
        assetCode: asset.code,
        assetName: asset.nameTh,
        assetTypeName: asset.assetType
          ? `${asset.assetType.code} · ${asset.assetType.nameTh}`
          : null,
        items: [
          ...(asset.assetType?.fields ?? []).map((field) => ({
            ...field,
            source: "DEFAULT" as const,
          })),
          ...(asset.pmCheckSheetItems ?? []).map((item) => ({
            ...item,
            labelEn: null,
            source: "CUSTOM" as const,
          })),
        ],
      },
    ]),
  );
}

export function serializePmCheckSheetSnapshot(snapshot: PmCheckSheetSnapshot | undefined) {
  return snapshot ? JSON.stringify(snapshot) : null;
}

export function parsePmCheckSheetSnapshot(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? "null") as PmCheckSheetSnapshot;
    if (parsed?.version !== 1 || !parsed.assetId || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function pmCheckSheetResultName(assetId: string, item: Pick<PmCheckSheetSnapshotItem, "id" | "source">) {
  return `result_${assetId}_${item.source === "CUSTOM" ? "custom_" : ""}${item.id}`;
}

export function pmCheckSheetOtherName(assetId: string, item: Pick<PmCheckSheetSnapshotItem, "id" | "source">) {
  return `other_${assetId}_${item.source === "CUSTOM" ? "custom_" : ""}${item.id}`;
}

export async function createPmCheckSheetItem(
  actor: PermissionUserContext,
  input: Scope & { assetId: string } & Parameters<typeof normalizedItem>[0],
) {
  authorize(actor, input);
  return db.$transaction(async (tx) => {
    const asset = await tx.asset.findFirstOrThrow({
      where: {
        id: input.assetId,
        plantId: input.plantId,
        plant: { organizationId: input.organizationId, active: true, organization: { active: true } },
      },
      select: { id: true },
    });
    const last = await tx.pmCheckSheetItem.aggregate({
      where: { assetId: asset.id },
      _max: { sortOrder: true },
    });
    const row = await tx.pmCheckSheetItem.create({
      data: {
        assetId: asset.id,
        ...normalizedItem(input),
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    await tx.auditEvent.create({
      data: {
        actorId: actorId(actor),
        organizationId: input.organizationId,
        plantId: input.plantId,
        entityType: "PmCheckSheetItem",
        entityId: row.id,
        action: "CREATE_PM_CHECK_SHEET_ITEM",
        afterJson: JSON.stringify(row),
      },
    });
    return row;
  });
}

export async function updatePmCheckSheetItem(
  actor: PermissionUserContext,
  input: Scope & { assetId: string; itemId: string } & Parameters<typeof normalizedItem>[0],
) {
  authorize(actor, input);
  return db.$transaction(async (tx) => {
    const before = await tx.pmCheckSheetItem.findFirstOrThrow({
      where: {
        id: input.itemId,
        assetId: input.assetId,
        active: true,
        asset: { plantId: input.plantId, plant: { organizationId: input.organizationId } },
      },
    });
    const row = await tx.pmCheckSheetItem.update({
      where: { id: before.id },
      data: normalizedItem(input),
    });
    await tx.auditEvent.create({
      data: {
        actorId: actorId(actor),
        organizationId: input.organizationId,
        plantId: input.plantId,
        entityType: "PmCheckSheetItem",
        entityId: row.id,
        action: "UPDATE_PM_CHECK_SHEET_ITEM",
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(row),
      },
    });
    return row;
  });
}

export async function retirePmCheckSheetItem(
  actor: PermissionUserContext,
  input: Scope & { assetId: string; itemId: string },
) {
  authorize(actor, input);
  return db.$transaction(async (tx) => {
    const before = await tx.pmCheckSheetItem.findFirstOrThrow({
      where: {
        id: input.itemId,
        assetId: input.assetId,
        active: true,
        asset: { plantId: input.plantId, plant: { organizationId: input.organizationId } },
      },
    });
    const row = await tx.pmCheckSheetItem.update({ where: { id: before.id }, data: { active: false } });
    await tx.auditEvent.create({
      data: {
        actorId: actorId(actor),
        organizationId: input.organizationId,
        plantId: input.plantId,
        entityType: "PmCheckSheetItem",
        entityId: row.id,
        action: "RETIRE_PM_CHECK_SHEET_ITEM",
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(row),
      },
    });
    return row;
  });
}
