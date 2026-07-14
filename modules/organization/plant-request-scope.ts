import { db } from "../../lib/db";
import {
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_PLANT_ID,
  defaultPlantRecord,
} from "./organization-foundation";

export type RequestPlantScope = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
};

type PlantRequestScopeStore = {
  findActivePlantByCode(code: string): Promise<RequestPlantScope | null>;
  findDefaultPlant(): Promise<RequestPlantScope | null>;
};

const plantScopeSelect = {
  id: true,
  organizationId: true,
  code: true,
  name: true,
} as const;

type PlantLookupClient = {
  plant: {
    findFirst(args: {
      where: { code: string; active: true };
      select: typeof plantScopeSelect;
    }): Promise<RequestPlantScope | null>;
    findUnique(args: {
      where: { id: string };
      select: typeof plantScopeSelect;
    }): Promise<RequestPlantScope | null>;
  };
};

export function createPrismaRequestPlantScopeStore(client: PlantLookupClient): PlantRequestScopeStore {
  return {
    findActivePlantByCode: (code) =>
      client.plant.findFirst({
        where: { code, active: true },
        select: plantScopeSelect,
      }),
    findDefaultPlant: () =>
      client.plant.findUnique({
        where: { id: DEFAULT_PLANT_ID },
        select: plantScopeSelect,
      }),
  };
}

export async function readRequestPlantScope(plantCode?: string | null) {
  return resolveRequestPlantScope(createPrismaRequestPlantScopeStore(db), plantCode);
}

export async function resolveRequestPlantScope(
  store: PlantRequestScopeStore,
  plantCode?: string | null,
): Promise<RequestPlantScope> {
  const normalizedCode = normalizeRequestPlantCode(plantCode);
  if (normalizedCode) {
    const plant = await store.findActivePlantByCode(normalizedCode);
    if (plant) return plant;
  }
  return (await store.findDefaultPlant()) ?? defaultRequestPlantScope();
}

function normalizeRequestPlantCode(plantCode?: string | null) {
  return (plantCode ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultRequestPlantScope(): RequestPlantScope {
  return {
    id: defaultPlantRecord.id,
    organizationId: defaultPlantRecord.organizationId,
    code: defaultPlantRecord.code,
    name: defaultPlantRecord.name,
  };
}
