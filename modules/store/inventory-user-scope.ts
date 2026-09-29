import type { Prisma, UserInventoryScope } from "@prisma/client";

export const INVENTORY_ITEM_KINDS = ["SPARE_PART", "CHEMICAL", "OIL"] as const;
export type InventoryItemKind = (typeof INVENTORY_ITEM_KINDS)[number];

export function normalizeInventoryScopeKinds(values: FormDataEntryValue[]) {
  const allowed = new Set<string>(INVENTORY_ITEM_KINDS);
  return [
    ...new Set(
      values
        .map(String)
        .filter((value): value is InventoryItemKind => allowed.has(value)),
    ),
  ];
}

export function defaultInventoryItemKind(actor: {
  inventoryScopes?: Pick<
    UserInventoryScope,
    "itemKind" | "responsibilityEnabled" | "approvalEnabled"
  >[];
}): InventoryItemKind {
  const enabledKinds = new Set(
    actor.inventoryScopes
      ?.filter((scope) => scope.responsibilityEnabled || scope.approvalEnabled)
      .map((scope) => scope.itemKind),
  );

  if (enabledKinds.has("SPARE_PART")) return "SPARE_PART";
  if (enabledKinds.has("CHEMICAL")) return "CHEMICAL";
  if (enabledKinds.has("OIL")) return "OIL";
  return "SPARE_PART";
}

export function hasInventoryResponsibility(
  actor: {
    role: string;
    inventoryScopes?: Pick<
      UserInventoryScope,
      "itemKind" | "responsibilityEnabled"
    >[];
  },
  itemKind: string,
) {
  if (actor.role === "ADMIN") return true;
  return (
    actor.inventoryScopes?.some(
      (scope) => scope.itemKind === itemKind && scope.responsibilityEnabled,
    ) ?? false
  );
}

export function hasInventoryApproval(
  actor: {
    role: string;
    inventoryScopes?: Pick<
      UserInventoryScope,
      "itemKind" | "approvalEnabled"
    >[];
  },
  itemKind: string,
) {
  if (actor.role === "ADMIN") return true;
  return (
    actor.inventoryScopes?.some(
      (scope) => scope.itemKind === itemKind && scope.approvalEnabled,
    ) ?? false
  );
}

export async function getIssueItemKind(
  tx: Prisma.TransactionClient,
  issueId: string,
  plantId: string,
) {
  const issue = await tx.sparePartIssue.findFirstOrThrow({
    where: { id: issueId, plantId },
    select: { itemKind: true, requesterUserId: true, engineerId: true },
  });
  return issue;
}
