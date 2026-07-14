import { db } from "../../lib/db";
import { canManageCompanyOrganization, canManagePlantProfile } from "../auth/permission";
import type { Actor } from "../cm-work/cm-work-types";
import {
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_PLANT_ID,
  defaultOrganizationRecord,
  defaultPlantRecord,
  normalizeOrganizationRecordInput,
  normalizePlantRecordInput,
} from "./organization-foundation";

export type OrganizationScopeInput = {
  organizationName: string;
  organizationSlug: string;
  plantName: string;
  plantCode: string;
};

export type PlantScopeInput = {
  plantName: string;
  plantCode: string;
};

export type OrganizationScope = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  plant: {
    id: string;
    name: string;
    code: string;
  };
};

export type OrganizationScopeStore = {
  read(): Promise<OrganizationScope | null>;
  update(input: OrganizationScopeInput, actorId: string): Promise<OrganizationScope>;
  updatePlant(input: PlantScopeInput, actorId: string, plantId?: string | null): Promise<OrganizationScope>;
};

const prismaStore: OrganizationScopeStore = {
  read: async () => {
    const organization = await db.organization.findUnique({
      where: { id: DEFAULT_ORGANIZATION_ID },
      include: { plants: { where: { id: DEFAULT_PLANT_ID }, take: 1 } },
    });
    if (!organization) return null;
    const plant = organization.plants[0];
    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      plant: {
        id: plant?.id ?? DEFAULT_PLANT_ID,
        name: plant?.name ?? defaultPlantRecord.name,
        code: plant?.code ?? defaultPlantRecord.code,
      },
    };
  },
  update: (input, actorId) =>
    db.$transaction(async (tx) => {
      const previousOrganization = await tx.organization.findUnique({ where: { id: DEFAULT_ORGANIZATION_ID } });
      const previousPlant = await tx.plant.findUnique({ where: { id: DEFAULT_PLANT_ID } });

      const organization = await tx.organization.upsert({
        where: { id: DEFAULT_ORGANIZATION_ID },
        update: {
          name: input.organizationName,
          slug: input.organizationSlug,
          active: true,
        },
        create: {
          id: DEFAULT_ORGANIZATION_ID,
          name: input.organizationName,
          slug: input.organizationSlug,
          active: true,
        },
      });
      const plant = await tx.plant.upsert({
        where: { id: DEFAULT_PLANT_ID },
        update: {
          organizationId: organization.id,
          name: input.plantName,
          code: input.plantCode,
          active: true,
        },
        create: {
          id: DEFAULT_PLANT_ID,
          organizationId: organization.id,
          name: input.plantName,
          code: input.plantCode,
          active: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId,
          entityType: "OrganizationScope",
          entityId: DEFAULT_ORGANIZATION_ID,
          action: "UPDATE_ORGANIZATION_SCOPE",
          beforeJson: JSON.stringify({
            organizationName: previousOrganization?.name ?? defaultOrganizationRecord.name,
            organizationSlug: previousOrganization?.slug ?? defaultOrganizationRecord.slug,
            plantName: previousPlant?.name ?? defaultPlantRecord.name,
            plantCode: previousPlant?.code ?? defaultPlantRecord.code,
          }),
          afterJson: JSON.stringify(input),
        },
      });

      return {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        plant: {
          id: plant.id,
          name: plant.name,
          code: plant.code,
        },
      };
    }),
  updatePlant: (input, actorId, actorPlantId) =>
    db.$transaction(async (tx) => {
      const plantId = actorPlantId?.trim() || DEFAULT_PLANT_ID;
      const previousPlant = await tx.plant.findUnique({ where: { id: plantId } });
      const plant = await tx.plant.update({
        where: { id: plantId },
        data: {
          name: input.plantName,
          code: input.plantCode,
          active: true,
        },
        include: { organization: true },
      });

      await tx.auditEvent.create({
        data: {
          actorId,
          organizationId: plant.organizationId,
          plantId: plant.id,
          entityType: "Plant",
          entityId: plant.id,
          action: "UPDATE_PLANT_PROFILE",
          beforeJson: JSON.stringify({
            plantName: previousPlant?.name ?? defaultPlantRecord.name,
            plantCode: previousPlant?.code ?? defaultPlantRecord.code,
          }),
          afterJson: JSON.stringify(input),
        },
      });

      return {
        organization: {
          id: plant.organizationId,
          name: plant.organization.name,
          slug: plant.organization.slug,
        },
        plant: {
          id: plant.id,
          name: plant.name,
          code: plant.code,
        },
      };
    }),
};

export async function readOrganizationScope(store: OrganizationScopeStore = prismaStore): Promise<OrganizationScope> {
  const scope = await store.read();
  return scope ?? {
    organization: {
      id: defaultOrganizationRecord.id,
      name: defaultOrganizationRecord.name,
      slug: defaultOrganizationRecord.slug,
    },
    plant: {
      id: defaultPlantRecord.id,
      name: defaultPlantRecord.name,
      code: defaultPlantRecord.code,
    },
  };
}

export async function updateOrganizationScope(
  actor: Actor,
  input: OrganizationScopeInput,
  store: OrganizationScopeStore = prismaStore,
) {
  if (!canManageCompanyOrganization(actor)) throw new Error("Only admin can update the organization and plant scope");
  const organization = normalizeOrganizationRecordInput({
    name: input.organizationName,
    slug: input.organizationSlug,
  });
  const plant = normalizePlantRecordInput({
    name: input.plantName,
    code: input.plantCode,
  });
  return store.update(
    {
      organizationName: organization.name,
      organizationSlug: organization.slug,
      plantName: plant.name,
      plantCode: plant.code,
    },
    actor.id,
  );
}

export async function updatePlantScope(
  actor: Actor,
  input: PlantScopeInput,
  store: OrganizationScopeStore = prismaStore,
) {
  if (!canManagePlantProfile(actor)) throw new Error("Only admin or permitted Site Admin can update the plant scope");
  const plant = normalizePlantRecordInput({
    name: input.plantName,
    code: input.plantCode,
  });
  return store.updatePlant(
    {
      plantName: plant.name,
      plantCode: plant.code,
    },
    actor.id,
    actor.plantId,
  );
}
