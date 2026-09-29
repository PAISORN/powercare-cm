import { describe, expect, it } from "vitest";
import {
  parseCreateManagedUserInput,
  parseDeleteManagedUserInput,
  parseUpdateManagedUserInput,
} from "./managed-user-mutation-input";

describe("managed user action input", () => {
  it("normalizes create fields and deduplicates scoped selections", () => {
    const form = new FormData();
    form.set("username", "  tech.one  ");
    form.set("password", "  secret  ");
    form.set("fullName", "  Tech One  ");
    form.set("department", "  Maintenance  ");
    form.set("role", "STORE_OFFICER");
    form.set("organizationId", "  org-1  ");
    form.set("plantId", "  plant-1  ");
    form.set("categoryId", "cat-a");
    form.append("categoryIds", "cat-a");
    form.append("categoryIds", "cat-b");
    form.append("inventoryResponsibility", "SPARE_PART");
    form.append("inventoryResponsibility", "SPARE_PART");
    form.append("inventoryApproval", "INVALID");
    form.append("inventoryApproval", "OIL");

    expect(parseCreateManagedUserInput(form)).toEqual({
      username: "tech.one",
      password: "  secret  ",
      fullName: "Tech One",
      department: "Maintenance",
      role: "STORE_OFFICER",
      organizationId: "org-1",
      plantId: "plant-1",
      categoryIds: ["cat-a", "cat-b"],
      inventoryResponsibilityKinds: ["SPARE_PART"],
      inventoryApprovalKinds: ["OIL"],
    });
  });

  it("parses checkbox state, optional identifiers, and non-empty uploads", () => {
    const form = new FormData();
    form.set("userId", " user-1 ");
    form.set("active", "on");
    form.set("organizationId", "");
    form.set("plantId", "   ");
    const signature = new File(["sig"], "signature.png", { type: "image/png" });
    form.set("signature", signature);
    form.set("profilePhoto", new File([], "empty.png", { type: "image/png" }));

    const input = parseUpdateManagedUserInput(form);

    expect(input.userId).toBe("user-1");
    expect(input.active).toBe(true);
    expect(input.organizationId).toBeNull();
    expect(input.plantId).toBeNull();
    expect(input.signatureFile).toBe(signature);
    expect(input.profilePhotoFile).toBeNull();
  });

  it("keeps delete credentials in a small typed contract", () => {
    const form = new FormData();
    form.set("userId", " user-1 ");
    form.set("adminPassword", " secret ");

    expect(parseDeleteManagedUserInput(form)).toEqual({
      userId: "user-1",
      adminPassword: " secret ",
    });
  });
});
