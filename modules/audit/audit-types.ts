export type AuditInput = {
  cmWorkId?: string;
  actorId?: string;
  organizationId?: string | null;
  plantId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};
