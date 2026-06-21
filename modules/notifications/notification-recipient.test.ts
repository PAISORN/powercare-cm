import { describe, expect, it } from "vitest";
import { selectRecipients } from "./notification-recipient";

const users = [
  { id: "admin", role: "ADMIN", categoryId: null, active: true },
  { id: "engineer", role: "ENGINEER", categoryId: "electrical", active: true },
  { id: "claimant", role: "TECHNICIAN", categoryId: "electrical", active: true },
  { id: "mechanical", role: "TECHNICIAN", categoryId: "mechanical", active: true },
  { id: "inactive", role: "TECHNICIAN", categoryId: "electrical", active: false },
];

describe("selectRecipients", () => {
  it("targets admin and matching-category staff for a new request", () => {
    expect(selectRecipients({ eventType: "NEW_REQUEST", categoryId: "electrical", actorId: null, claimantId: null }, users).map((user) => user.id)).toEqual(["admin", "engineer", "claimant"]);
  });

  it("excludes the actor and inactive or mismatched users", () => {
    expect(selectRecipients({ eventType: "IN_PROGRESS", categoryId: "electrical", actorId: "engineer", claimantId: "claimant" }, users).map((user) => user.id)).toEqual(["admin", "claimant"]);
  });
});
