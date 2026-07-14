import { db } from "../../lib/db";
import { DEFAULT_ORGANIZATION_ID } from "../organization/organization-foundation";
import { createServerLineClient } from "./line-client";
import type { LineGroupEvent } from "./line-webhook";

type DiscoveryUpsert = {
  groupId: string;
  organizationId?: string;
  eventType: string;
  displayName: string | null;
  seenAt: Date;
};

export type LineGroupDiscoveryRepository = {
  upsert(input: DiscoveryUpsert): Promise<unknown>;
};

export type LineGroupSummaryClient = {
  getGroupSummary(groupId: string): Promise<{ groupId: string; groupName: string }>;
};

export function createLineGroupDiscoveryService({
  repository,
  summaryClient,
  now = () => new Date(),
}: {
  repository: LineGroupDiscoveryRepository;
  summaryClient: LineGroupSummaryClient;
  now?: () => Date;
}) {
  return {
    async discover(events: LineGroupEvent[], organizationId = DEFAULT_ORGANIZATION_ID) {
      const latestByGroup = new Map(events.map((event) => [event.groupId, event]));

      await Promise.all(
        [...latestByGroup.values()].map(async (event) => {
          let displayName: string | null = null;
          try {
            const summary = await summaryClient.getGroupSummary(event.groupId);
            displayName = summary.groupName.trim() || null;
          } catch {
            displayName = null;
          }

          await repository.upsert({
            groupId: event.groupId,
            organizationId,
            eventType: event.eventType,
            displayName,
            seenAt: now(),
          });
        }),
      );
    },
  };
}

const prismaDiscoveryRepository: LineGroupDiscoveryRepository = {
  upsert(input) {
    return db.lineGroupDiscovery.upsert({
      where: { groupId: input.groupId },
      update: {
        displayName: input.displayName ?? undefined,
        eventType: input.eventType,
        lastSeenAt: input.seenAt,
        organizationId: input.organizationId ?? DEFAULT_ORGANIZATION_ID,
      },
      create: {
        groupId: input.groupId,
        organizationId: input.organizationId ?? DEFAULT_ORGANIZATION_ID,
        displayName: input.displayName,
        eventType: input.eventType,
        firstSeenAt: input.seenAt,
        lastSeenAt: input.seenAt,
      },
    });
  },
};

export function discoverLineGroups(events: LineGroupEvent[], organizationId = DEFAULT_ORGANIZATION_ID) {
  return createLineGroupDiscoveryService({
    repository: prismaDiscoveryRepository,
    summaryClient: createServerLineClient(),
  }).discover(events, organizationId);
}

export function listLineGroupDiscoveries(organizationId?: string) {
  return db.lineGroupDiscovery.findMany({
    where: { organizationId },
    include: { addedDestination: true },
    orderBy: { lastSeenAt: "desc" },
  });
}
