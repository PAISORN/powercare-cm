import { db } from "../../lib/db";
import type { AuditInput } from "./audit-types";

export async function recordAudit(input: AuditInput) {
  return db.auditEvent.create({
    data: {
      cmWorkId: input.cmWorkId,
      actorId: input.actorId,
      organizationId: input.organizationId,
      plantId: input.plantId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson: input.before ? JSON.stringify(input.before) : null,
      afterJson: input.after ? JSON.stringify(input.after) : null,
      reason: input.reason,
    },
  });
}
