"use server";

import { revalidatePath } from "next/cache";
import type {
  TreeAssetCreateState,
  TreeAssetLevel,
} from "../../components/asset-tree-create-drawer";
import type { TreeAssetDeleteState } from "../../components/asset-tree-delete-dialog";
import type { TreeAssetEditState } from "../../components/asset-tree-edit-drawer";
import { db } from "../../lib/db";
import { verifyPassword } from "../../lib/password";
import { requireUser } from "../../lib/session";
import {
  canManageAssets,
  canRecodeAssets,
} from "../../modules/auth/permission";
import { resolveAssetScope } from "../../modules/assets/asset-scope";
import {
  createRegisteredAsset,
  updateRegisteredAsset,
} from "../../modules/assets/asset-service";
export async function createTreeAsset(
  _previousState: TreeAssetCreateState,
  formData: FormData,
): Promise<TreeAssetCreateState> {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user))
    return { status: "error", message: "ไม่มีสิทธิ์เพิ่ม Asset" };

  try {
    const scope = await resolveAssetScope(user, {
      organizationId: formText(formData, "organizationId"),
      plantId: formText(formData, "plantId"),
    });
    const sourceKind = formText(formData, "sourceKind");
    const sourceId = formText(formData, "sourceId");
    const assetLevel = formText(formData, "assetLevel") as TreeAssetLevel;
    let systemId = "";
    let parentId: string | null = null;
    let allowedLevels: TreeAssetLevel[] = [];

    if (sourceKind === "system") {
      const system = await db.assetSystem.findFirstOrThrow({
        where: { id: sourceId, plantId: scope.plant.id, active: true },
        select: { id: true },
      });
      systemId = system.id;
      allowedLevels = ["MAIN_ASSET", "SUB_ASSET", "PART"];
    } else if (sourceKind === "asset") {
      const parent = await db.asset.findFirstOrThrow({
        where: {
          id: sourceId,
          plantId: scope.plant.id,
          registrationStatus: "ACTIVE",
          migrationStatus: "READY",
        },
        select: { id: true, systemId: true, assetLevel: true },
      });
      if (!parent.systemId) throw new Error("Parent Asset ไม่มี System");
      systemId = parent.systemId;
      parentId = parent.id;
      allowedLevels =
        parent.assetLevel === "MAIN_ASSET"
          ? ["SUB_ASSET", "PART"]
          : parent.assetLevel === "SUB_ASSET"
            ? ["PART"]
            : [];
    } else {
      throw new Error("ตำแหน่งที่จะเพิ่ม Asset ไม่ถูกต้อง");
    }

    if (!allowedLevels.includes(assetLevel))
      throw new Error("ระดับ Asset ไม่ตรงกับกิ่งที่เลือก");
    await createRegisteredAsset(
      {
        plantId: scope.plant.id,
        code: formText(formData, "code"),
        systemId,
        parentId,
        assetLevel,
        assetTypeId: formText(formData, "assetTypeId"),
        zoneId: optionalFormText(formData, "zoneId"),
        nameTh: formText(formData, "nameTh"),
        discipline: optionalFormText(formData, "discipline"),
        manufacturer: optionalFormText(formData, "manufacturer"),
        model: optionalFormText(formData, "model"),
        serialNumber: optionalFormText(formData, "serialNumber"),
        keySpecification: optionalFormText(formData, "keySpecification"),
        operatingStatus: formText(formData, "operatingStatus"),
        criticality: formText(formData, "criticality"),
      },
      {
        actorId: user.id,
        organizationId: scope.organization.id,
        auditSource: "TREE_DRAWER",
      },
    );
    revalidatePath("/assets");
    return { status: "success" };
  } catch (caught) {
    return {
      status: "error",
      message:
        caught instanceof Error ? caught.message : "สร้าง Asset ไม่สำเร็จ",
    };
  }
}

export async function editTreeAsset(
  _previousState: TreeAssetEditState,
  formData: FormData,
): Promise<TreeAssetEditState> {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user))
    return { status: "error", message: "ไม่มีสิทธิ์แก้ไข Asset" };

  try {
    const scope = await resolveAssetScope(user, {
      organizationId: formText(formData, "organizationId"),
      plantId: formText(formData, "plantId"),
    });
    const assetId = formText(formData, "assetId");
    const asset = await db.asset.findFirstOrThrow({
      where: {
        id: assetId,
        plantId: scope.plant.id,
        registrationStatus: "ACTIVE",
      },
    });
    const submittedName = formText(formData, "name");
    await updateRegisteredAsset(
      asset.id,
      {
        plantId: asset.plantId,
        code: canRecodeAssets(user) ? formText(formData, "code") : asset.code,
        systemId: asset.systemId,
        assetTypeId: formText(formData, "assetTypeId"),
        assetLevel: asset.assetLevel,
        familyId: asset.familyId,
        assetClassId: asset.assetClassId,
        zoneId: optionalFormText(formData, "zoneId"),
        parentId: asset.parentId,
        componentCode: asset.componentCode,
        nameTh: asset.nameEn?.trim()
          ? asset.nameTh || submittedName
          : submittedName,
        nameEn: asset.nameEn?.trim() ? submittedName : null,
        discipline: optionalFormText(formData, "discipline"),
        tagKks: asset.tagKks,
        registrationCode: asset.registrationCode,
        keySpecification: optionalFormText(formData, "keySpecification"),
        metadataJson: asset.metadataJson,
        installationLocation: asset.installationLocation,
        manufacturer: optionalFormText(formData, "manufacturer"),
        model: optionalFormText(formData, "model"),
        serialNumber: optionalFormText(formData, "serialNumber"),
        installedAt: asset.installedAt,
        commissionedAt: asset.commissionedAt,
        operatingStatus: formText(formData, "operatingStatus"),
        criticality: formText(formData, "criticality"),
      },
      {
        actorId: user.id,
        organizationId: scope.organization.id,
        auditSource: "TREE_DRAWER",
      },
    );
    revalidatePath("/assets");
    return { status: "success" };
  } catch (caught) {
    return {
      status: "error",
      message:
        caught instanceof Error ? caught.message : "แก้ไข Asset ไม่สำเร็จ",
    };
  }
}

export async function deleteTreeAsset(
  _previousState: TreeAssetDeleteState,
  formData: FormData,
): Promise<TreeAssetDeleteState> {
  "use server";
  const user = await requireUser();
  if (!canManageAssets(user))
    return { status: "error", message: "ไม่มีสิทธิ์ลบ Asset" };

  const password = String(formData.get("password") || "");
  if (!password) return { status: "error", message: "กรุณากรอกรหัสผ่าน" };

  try {
    const scope = await resolveAssetScope(user, {
      organizationId: formText(formData, "organizationId"),
      plantId: formText(formData, "plantId"),
    });
    const currentUser = await db.user.findFirst({
      where: { id: user.id, active: true },
      select: { passwordHash: true },
    });
    if (
      !currentUser ||
      !(await verifyPassword(password, currentUser.passwordHash))
    ) {
      return { status: "error", message: "รหัสผ่านไม่ถูกต้อง" };
    }

    const assetId = formText(formData, "assetId");
    const asset = await db.$transaction(async (tx) => {
      const current = await tx.asset.findFirstOrThrow({
        where: {
          id: assetId,
          plantId: scope.plant.id,
          registrationStatus: "ACTIVE",
        },
        select: {
          id: true,
          code: true,
          nameTh: true,
          assetLevel: true,
          systemId: true,
          parentId: true,
        },
      });
      const activeChildren = await tx.asset.count({
        where: {
          parentId: current.id,
          plantId: scope.plant.id,
          registrationStatus: "ACTIVE",
        },
      });
      if (activeChildren)
        throw new Error(
          `ไม่สามารถลบ ${current.code || current.nameTh} ได้ เนื่องจากยังมี Asset ย่อย ${activeChildren} รายการ`,
        );
      const result = await tx.asset.updateMany({
        where: {
          id: current.id,
          plantId: scope.plant.id,
          registrationStatus: "ACTIVE",
        },
        data: {
          registrationStatus: "CANCELED",
          operatingStatus: "RETIRED",
          cancellationReason: "ลบผ่าน Tree Assets",
        },
      });
      if (result.count !== 1)
        throw new Error("Asset ถูกแก้ไขโดยผู้ใช้อื่น กรุณาลองใหม่");
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          organizationId: scope.organization.id,
          plantId: scope.plant.id,
          entityType: "Asset",
          entityId: current.id,
          action: "DELETE_ASSET",
          beforeJson: JSON.stringify({
            code: current.code,
            nameTh: current.nameTh,
            assetLevel: current.assetLevel,
            systemId: current.systemId,
            parentId: current.parentId,
            registrationStatus: "ACTIVE",
          }),
          afterJson: JSON.stringify({
            registrationStatus: "CANCELED",
            operatingStatus: "RETIRED",
            source: "TREE_DIALOG",
          }),
        },
      });
      return current;
    });
    revalidatePath("/assets");
    return { status: "success" };
  } catch (caught) {
    return {
      status: "error",
      message: caught instanceof Error ? caught.message : "ลบ Asset ไม่สำเร็จ",
    };
  }
}

function formText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}
function optionalFormText(formData: FormData, key: string) {
  return formText(formData, key) || null;
}
