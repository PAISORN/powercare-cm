import { describe, expect, it } from "vitest";
import { selectRecipients } from "./notification-recipient";

const users = [
  { id: "admin", role: "ADMIN", categoryId: null, plantId: null, active: true },
  { id: "org-admin", role: "ORGANIZATION_ADMIN", categoryId: null, plantId: null, active: true },
  { id: "site-admin", role: "SITE_ADMIN", categoryId: null, plantId: "plant-a", active: true },
  { id: "legacy-site-admin", role: "PLANT_ADMIN", categoryId: null, plantId: "plant-a", active: true },
  { id: "other-site-admin", role: "SITE_ADMIN", categoryId: null, plantId: "plant-b", active: true },
  { id: "engineer", role: "ENGINEER", categoryId: "electrical", plantId: "plant-a", active: true },
  { id: "other-plant-engineer", role: "ENGINEER", categoryId: "electrical", plantId: "plant-b", active: true },
  { id: "claimant", role: "TECHNICIAN", categoryId: "electrical", plantId: "plant-a", active: true },
  { id: "mechanical", role: "TECHNICIAN", categoryId: "mechanical", plantId: "plant-a", active: true },
  { id: "inactive", role: "TECHNICIAN", categoryId: "electrical", plantId: "plant-a", active: false },
];

describe("selectRecipients", () => {
  it("targets owner admins, same-site site admin, and same-site matching-category staff for a new request", () => {
    expect(
      selectRecipients(
        { eventType: "NEW_REQUEST", categoryId: "electrical", plantId: "plant-a", actorId: null, claimantId: null },
        users,
      ).map((user) => user.id),
    ).toEqual(["admin", "org-admin", "site-admin", "legacy-site-admin", "engineer", "claimant"]);
  });

  it("excludes the actor and inactive or mismatched users", () => {
    expect(
      selectRecipients(
        { eventType: "IN_PROGRESS", categoryId: "electrical", plantId: "plant-a", actorId: "engineer", claimantId: "claimant" },
        users,
      ).map((user) => user.id),
    ).toEqual(["admin", "org-admin", "site-admin", "legacy-site-admin", "claimant"]);
  });
});
