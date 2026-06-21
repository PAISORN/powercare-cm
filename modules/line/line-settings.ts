import { LINE_EVENT_TYPES, type LineEventType } from "./line-types";

export type LineDestinationInput = {
  displayName: string;
  targetId: string;
  categoryId: string | null;
  active: boolean;
  enabledEvents: LineEventType[];
};

export function parseLineDestinationInput(input: {
  displayName: string;
  targetId: string;
  categoryId?: string | null;
  active: boolean;
  enabledEvents: string[];
}): LineDestinationInput {
  const displayName = input.displayName.trim();
  const targetId = input.targetId.trim();
  if (!displayName) throw new Error("Destination name is required");
  if (!targetId) throw new Error("LINE target ID is required");
  const allowed = new Set<string>(LINE_EVENT_TYPES);
  const enabledEvents = LINE_EVENT_TYPES.filter((event) => input.enabledEvents.includes(event) && allowed.has(event));
  return {
    displayName,
    targetId,
    categoryId: input.categoryId?.trim() || null,
    active: input.active,
    enabledEvents,
  };
}

export function resolveLineDiscoveryPrefill(discovery: {
  id: string;
  groupId: string;
  displayName: string | null;
  addedDestinationId: string | null;
}) {
  if (discovery.addedDestinationId) return null;
  return {
    discoveryId: discovery.id,
    displayName: discovery.displayName?.trim() || "Discovered LINE group",
    targetId: discovery.groupId,
    active: false,
  };
}

export function maskLineTargetId(targetId: string) {
  const suffix = targetId.slice(-4);
  return `${"•".repeat(Math.max(4, targetId.length - suffix.length))}${suffix}`;
}
