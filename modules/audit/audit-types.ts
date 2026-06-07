export type AuditInput = {
  cmWorkId?: string;
  actorId?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
};
