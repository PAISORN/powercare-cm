import { db } from "../../lib/db";
import { canUpdateSystemSettings } from "../auth/permission";
import type { Actor } from "../cm-work/cm-work-types";

export type SystemSettingsStore = {
  read(): Promise<{ id: string; engineerWorkAssignmentEnabled: boolean } | null>;
  update(enabled: boolean, actorId: string): Promise<unknown>;
};

const prismaStore: SystemSettingsStore = {
  read: () => db.systemSetting.findUnique({ where: { id: "global" } }),
  update: (enabled, actorId) =>
    db.$transaction(async (tx) => {
      const previous = await tx.systemSetting.findUnique({ where: { id: "global" } });
      const before = previous?.engineerWorkAssignmentEnabled ?? false;
      const updated = await tx.systemSetting.upsert({
        where: { id: "global" },
        update: { engineerWorkAssignmentEnabled: enabled },
        create: { id: "global", engineerWorkAssignmentEnabled: enabled },
      });

      await tx.auditEvent.create({
        data: {
          actorId,
          entityType: "SystemSetting",
          entityId: "global",
          action: "UPDATE_ENGINEER_ASSIGNMENT_SETTING",
          beforeJson: JSON.stringify({ engineerWorkAssignmentEnabled: before }),
          afterJson: JSON.stringify({ engineerWorkAssignmentEnabled: enabled }),
        },
      });

      return updated;
    }),
};

export async function readEngineerAssignmentSetting(store: SystemSettingsStore = prismaStore) {
  return (await store.read())?.engineerWorkAssignmentEnabled ?? false;
}

export async function updateEngineerAssignmentSetting(
  actor: Actor,
  enabled: boolean,
  store: SystemSettingsStore = prismaStore,
) {
  if (!canUpdateSystemSettings(actor.role)) throw new Error("Only admin can update system settings");
  return store.update(enabled, actor.id);
}
