import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { writeStoreIssueAudit } from "./store-issue-prisma-shared";

describe("writeStoreIssueAudit", () => {
  it("records the actor, scope, issue, action, and serialized details", async () => {
    const create = vi.fn().mockResolvedValue({ id: "audit-1" });
    const tx = {
      auditEvent: { create },
    } as unknown as Prisma.TransactionClient;

    await writeStoreIssueAudit(
      tx,
      "user-1",
      { organizationId: "org-1", plantId: "plant-1", plantCode: "RTB" },
      "issue-1",
      "CREATE_STORE_ISSUE",
      { number: "SI-001" },
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        actorId: "user-1",
        organizationId: "org-1",
        plantId: "plant-1",
        entityType: "SparePartIssue",
        entityId: "issue-1",
        action: "CREATE_STORE_ISSUE",
        afterJson: JSON.stringify({ number: "SI-001" }),
      },
    });
  });
});
