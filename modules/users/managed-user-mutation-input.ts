import type { RoleName as RoleNameValue } from "../cm-work/cm-work-types";
import {
  normalizeInventoryScopeKinds,
  type InventoryItemKind,
} from "../store/inventory-user-scope";

export type CreateManagedUserInput = {
  username: string;
  password: string;
  fullName: string;
  department: string;
  role: RoleNameValue;
  organizationId: string | null;
  plantId: string | null;
  categoryIds: string[];
  inventoryResponsibilityKinds: InventoryItemKind[];
  inventoryApprovalKinds: InventoryItemKind[];
};

export type UpdateManagedUserInput = CreateManagedUserInput & {
  userId: string;
  active: boolean;
  signatureFile: File | null;
  profilePhotoFile: File | null;
};

export type DeleteManagedUserInput = {
  userId: string;
  adminPassword: string;
};

export function parseCreateManagedUserInput(
  formData: FormData,
): CreateManagedUserInput {
  return {
    username: text(formData, "username"),
    password: rawText(formData, "password"),
    fullName: text(formData, "fullName"),
    department: text(formData, "department"),
    role: text(formData, "role") as RoleNameValue,
    organizationId: optionalText(formData, "organizationId"),
    plantId: optionalText(formData, "plantId"),
    categoryIds: selectedCategoryIds(formData),
    inventoryResponsibilityKinds: normalizeInventoryScopeKinds(
      formData.getAll("inventoryResponsibility"),
    ),
    inventoryApprovalKinds: normalizeInventoryScopeKinds(
      formData.getAll("inventoryApproval"),
    ),
  };
}

export function parseUpdateManagedUserInput(
  formData: FormData,
): UpdateManagedUserInput {
  return {
    ...parseCreateManagedUserInput(formData),
    password: text(formData, "password"),
    userId: text(formData, "userId"),
    active: formData.get("active") === "on",
    signatureFile: uploadedFile(formData, "signature"),
    profilePhotoFile: uploadedFile(formData, "profilePhoto"),
  };
}

export function parseDeleteManagedUserInput(
  formData: FormData,
): DeleteManagedUserInput {
  return {
    userId: text(formData, "userId"),
    adminPassword: rawText(formData, "adminPassword"),
  };
}

function text(formData: FormData, key: string) {
  return rawText(formData, key).trim();
}

function rawText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function optionalText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function selectedCategoryIds(formData: FormData) {
  const selected = formData
    .getAll("categoryIds")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const legacy = optionalText(formData, "categoryId");
  return [...new Set(legacy ? [legacy, ...selected] : selected)];
}

function uploadedFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}
