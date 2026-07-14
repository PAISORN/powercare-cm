import { db } from "../../lib/db";
import { canManageEngineerAssignmentSetting } from "../auth/permission";
import type { Actor } from "../cm-work/cm-work-types";

export type SystemSettingsStore = {
  read(plantId?: string | null): Promise<{ id: string; engineerWorkAssignmentEnabled: boolean } | null>;
  update(enabled: boolean, actorId: string, plantId?: string | null, organizationId?: string | null): Promise<unknown>;
};

function systemSettingId(plantId?: string | null) {
  return plantId ? `plant:${plantId}` : "global";
}

const prismaStore: SystemSettingsStore = {
  async read(plantId) {
    const scoped = plantId
      ? await db.systemSetting.findUnique({ where: { plantId } })
      : null;
    if (scoped) return scoped;
    return db.systemSetting.findUnique({ where: { id: "global" } });
  },
  update: (enabled, actorId, plantId, organizationId) =>
    db.$transaction(async (tx) => {
      const id = systemSettingId(plantId);
      const previous = plantId
        ? await tx.systemSetting.findUnique({ where: { plantId } })
        : await tx.systemSetting.findUnique({ where: { id } });
      const before = previous?.engineerWorkAssignmentEnabled ?? false;
      const updated = await tx.systemSetting.upsert({
        where: { id: previous?.id ?? id },
        update: { engineerWorkAssignmentEnabled: enabled },
        create: { id, plantId: plantId ?? null, engineerWorkAssignmentEnabled: enabled },
      });

      await tx.auditEvent.create({
        data: {
          actorId,
          organizationId: organizationId ?? null,
          plantId: plantId ?? null,
          entityType: "SystemSetting",
          entityId: id,
          action: "UPDATE_ENGINEER_ASSIGNMENT_SETTING",
          beforeJson: JSON.stringify({ engineerWorkAssignmentEnabled: before }),
          afterJson: JSON.stringify({ engineerWorkAssignmentEnabled: enabled }),
        },
      });

      return updated;
    }),
};

export async function readEngineerAssignmentSetting(
  plantIdOrStore?: string | null | SystemSettingsStore,
  maybeStore: SystemSettingsStore = prismaStore,
) {
  const store = typeof plantIdOrStore === "object" && plantIdOrStore !== null ? plantIdOrStore : maybeStore;
  const plantId = typeof plantIdOrStore === "string" ? plantIdOrStore : null;
  return (await store.read(plantId))?.engineerWorkAssignmentEnabled ?? false;
}

export async function updateEngineerAssignmentSetting(
  actor: Actor,
  enabled: boolean,
  store: SystemSettingsStore = prismaStore,
  plantId?: string | null,
  organizationId?: string | null,
) {
  if (!canManageEngineerAssignmentSetting(actor)) throw new Error("Only admin can update engineer assignment settings");
  const targetPlantId = plantId ?? actor.plantId ?? null;
  return store.update(enabled, actor.id, targetPlantId, organizationId ?? null);
}
