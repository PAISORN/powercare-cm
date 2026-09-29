"use server";

import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/session";
import {
  adminScopeSearchFromFormData,
  resolveAdminSiteScope,
} from "../../../modules/admin/admin-site-scope";
import { canManageAssetMasters } from "../../../modules/auth/permission";
import {
  defaultAssetLevelForType,
  isInstrumentType,
  isSystemAssetType,
  isValidAssetSystemName,
} from "../../../modules/assets/asset-hierarchy";
import {
  normalizeAssetSegment,
  normalizeAssetTypeCode,
} from "../../../modules/assets/asset-service";

function destination(
  scope: { organization: { id: string }; plant: { id: string } },
  tab: string,
  result: "saved" | "deleted" | "used",
) {
  return `/assets/master-data?organizationId=${scope.organization.id}&plantId=${scope.plant.id}&tab=${tab}&${result}=1`;
}

export async function createMaster(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const kind = String(formData.get("kind"));
  const tab = String(formData.get("tab") || "classes");
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect(destination(scope, tab, "used"));
  if (kind === "system") {
    if (!isValidAssetSystemName(name))
      redirect(destination(scope, tab, "used"));
    await db.assetSystem.create({
      data: {
        plantId: scope.plant.id,
        code: normalizeAssetSegment(String(formData.get("code"))),
        nameTh: name,
        nameEn: null,
      },
    });
  }
  if (kind === "class")
    await db.assetClass.create({
      data: { plantId: scope.plant.id, nameTh: name, nameEn: null },
    });
  if (kind === "family")
    await db.assetFamily.create({
      data: {
        plantId: scope.plant.id,
        code: normalizeAssetSegment(String(formData.get("code"))),
        nameTh: name,
        nameEn: null,
      },
    });
  if (kind === "type") {
    if (isSystemAssetType(name)) redirect(destination(scope, tab, "used"));
    const recommendedLevel = defaultAssetLevelForType(name);
    const level =
      recommendedLevel === "PART"
        ? "PART"
        : String(formData.get("defaultLevel") || recommendedLevel);
    const discipline = isInstrumentType(name)
      ? "Instrument"
      : optional(formData, "discipline");
    await db.assetType.create({
      data: {
        plantId: scope.plant.id,
        assetClassId: String(formData.get("assetClassId")),
        code: normalizeAssetTypeCode(String(formData.get("code"))),
        nameTh: name,
        nameEn: null,
        defaultLevel: level,
        discipline,
      },
    });
  }
  redirect(destination(scope, tab, "saved"));
}

export async function createTechnicalField(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const assetType = await db.assetType.findFirstOrThrow({
    where: { id: String(formData.get("assetTypeId")), plantId: scope.plant.id },
  });
  if (assetType.defaultLevel === "PART")
    redirect(destination(scope, "fields", "used"));
  const label = String(formData.get("label") || "").trim();
  if (!label) redirect(destination(scope, "fields", "used"));
  const lastField = await db.assetTechnicalField.aggregate({
    where: { assetTypeId: assetType.id },
    _max: { sortOrder: true },
  });
  await db.assetTechnicalField.create({
    data: {
      assetTypeId: assetType.id,
      key: generateTechnicalFieldKey(label),
      labelTh: label,
      labelEn: null,
      dataType: String(formData.get("dataType") || "TEXT"),
      unit: optional(formData, "unit"),
      optionsJson: serializeTechnicalOptions(formData.get("options")),
      helpText: optional(formData, "helpText"),
      required: formData.get("required") === "on",
      sortOrder: (lastField._max.sortOrder ?? -1) + 1,
    },
  });
  redirect(destination(scope, "fields", "saved"));
}

export async function updateMaster(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id"));
  const tab = String(formData.get("tab"));
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect(destination(scope, tab, "used"));
  const common = {
    nameTh: name,
    nameEn: null,
    active: formData.get("active") === "on",
  };
  if (kind === "system") {
    if (!isValidAssetSystemName(name))
      redirect(destination(scope, tab, "used"));
    await db.assetSystem.updateMany({
      where: { id, plantId: scope.plant.id },
      data: {
        ...common,
        code: normalizeAssetSegment(String(formData.get("code"))),
      },
    });
  }
  if (kind === "class")
    await db.assetClass.updateMany({
      where: { id, plantId: scope.plant.id },
      data: common,
    });
  if (kind === "family")
    await db.assetFamily.updateMany({
      where: { id, plantId: scope.plant.id },
      data: {
        ...common,
        code: normalizeAssetSegment(String(formData.get("code"))),
      },
    });
  if (kind === "type") {
    if (isSystemAssetType(name)) redirect(destination(scope, tab, "used"));
    const recommendedLevel = defaultAssetLevelForType(name);
    if (
      recommendedLevel === "PART" &&
      (await db.asset.count({
        where: {
          plantId: scope.plant.id,
          assetTypeId: id,
          assetLevel: { not: "PART" },
        },
      }))
    )
      redirect(destination(scope, tab, "used"));
    const level =
      recommendedLevel === "PART"
        ? "PART"
        : String(formData.get("defaultLevel") || recommendedLevel);
    const discipline = isInstrumentType(name)
      ? "Instrument"
      : optional(formData, "discipline");
    await db.assetType.updateMany({
      where: { id, plantId: scope.plant.id },
      data: {
        ...common,
        code: normalizeAssetTypeCode(String(formData.get("code"))),
        assetClassId: String(formData.get("assetClassId")),
        defaultLevel: level,
        discipline,
      },
    });
  }
  redirect(destination(scope, tab, "saved"));
}

export async function updateTechnicalField(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const id = String(formData.get("id"));
  const field = await db.assetTechnicalField.findFirst({
    where: { id, assetType: { plantId: scope.plant.id } },
  });
  if (!field) redirect("/assets/master-data");
  const label = String(formData.get("label") || "").trim();
  if (!label) redirect(destination(scope, "fields", "used"));
  await db.assetTechnicalField.update({
    where: { id },
    data: {
      labelTh: label,
      labelEn: null,
      dataType: String(formData.get("dataType")),
      unit: optional(formData, "unit"),
      optionsJson: serializeTechnicalOptions(formData.get("options")),
      helpText: optional(formData, "helpText"),
      required: formData.get("required") === "on",
      active: formData.get("active") === "on",
    },
  });
  redirect(destination(scope, "fields", "saved"));
}

export async function deleteMaster(formData: FormData) {
  "use server";
  const user = await requireUser();
  if (!canManageAssetMasters(user)) redirect("/assets");
  const scope = await resolveAdminSiteScope(
    user,
    adminScopeSearchFromFormData(formData),
  );
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id"));
  const tab = String(formData.get("tab"));
  let used = false;
  if (kind === "system") {
    used =
      (await db.assetSystem.count({
        where: { id, plantId: scope.plant.id, assets: { some: {} } },
      })) > 0;
    if (!used)
      await db.assetSystem.deleteMany({
        where: { id, plantId: scope.plant.id },
      });
  }
  if (kind === "class") {
    used =
      (await db.assetClass.count({
        where: {
          id,
          plantId: scope.plant.id,
          OR: [{ assets: { some: {} } }, { types: { some: {} } }],
        },
      })) > 0;
    if (!used)
      await db.assetClass.deleteMany({
        where: { id, plantId: scope.plant.id },
      });
  }
  if (kind === "family") {
    used =
      (await db.assetFamily.count({
        where: { id, plantId: scope.plant.id, assets: { some: {} } },
      })) > 0;
    if (!used)
      await db.$transaction([
        db.assetSequence.deleteMany({
          where: { familyId: id, plantId: scope.plant.id },
        }),
        db.assetFamily.deleteMany({ where: { id, plantId: scope.plant.id } }),
      ]);
  }
  if (kind === "type") {
    used =
      (await db.assetType.count({
        where: { id, plantId: scope.plant.id, assets: { some: {} } },
      })) > 0;
    if (!used)
      await db.assetType.deleteMany({ where: { id, plantId: scope.plant.id } });
  }
  if (kind === "field") {
    const field = await db.assetTechnicalField.findFirst({
      where: { id, assetType: { plantId: scope.plant.id } },
      include: { _count: { select: { values: true } } },
    });
    used = !field || field._count.values > 0;
    if (!used) await db.assetTechnicalField.delete({ where: { id } });
  }
  redirect(destination(scope, tab, used ? "used" : "deleted"));
}

function serializeTechnicalOptions(value: FormDataEntryValue | null) {
  const raw = String(value || "");
  let options: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    options = Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    options = raw.split(",");
  }
  options = options.map((item) => item.trim()).filter(Boolean);
  return options.length ? JSON.stringify([...new Set(options)]) : null;
}

function optional(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim() || null;
}

function generateTechnicalFieldKey(label: string) {
  const slug =
    label
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field";
  return `${slug}_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}
