import { describe, expect, it } from "vitest";
import { assignWorkWithStore, type AssignmentStore } from "./cm-work-service";
import { RoleName, WorkStatus, type Actor } from "./cm-work-types";

const electricalEngineer: Actor = {
  id: "eng-electrical",
  role: RoleName.ENGINEER,
  categoryId: "electrical",
};
const admin: Actor = { id: "admin", role: RoleName.ADMIN, categoryId: null };

function fakeStore(
  options: {
    enabled?: boolean;
    claimantId?: string | null;
    technicianActive?: boolean;
  } = {},
): AssignmentStore & { writes: string[] } {
  const writes: string[] = [];
  const technicians = {
    "tech-electrical": {
      id: "tech-electrical",
      fullName: "Electrical Technician",
      role: RoleName.TECHNICIAN,
      categoryId: "electrical",
      active: options.technicianActive ?? true,
    },
    "tech-mechanical": {
      id: "tech-mechanical",
      fullName: "Mechanical Technician",
      role: RoleName.TECHNICIAN,
      categoryId: "mechanical",
      active: true,
    },
  };

  return {
    writes,
    async getWork() {
      return {
        id: "work-1",
        status: WorkStatus.NEW,
        categoryId: "electrical",
        claimantId: options.claimantId ?? null,
      };
    },
    async getTechnician(id) {
      return technicians[id as keyof typeof technicians] ?? null;
    },
    async getEngineerAssignmentEnabled() {
      return options.enabled ?? true;
    },
    async claimIfAvailable(input) {
      if (options.claimantId) return null;
      writes.push("work", "status-history", "audit");
      return { id: input.cmWorkId, claimantId: input.technicianId, status: WorkStatus.CLAIMED };
    },
  };
}

describe("assignWorkWithStore", () => {
  it("assigns an electrical technician when the engineer switch is enabled", async () => {
    const result = await assignWorkWithStore(
      fakeStore({ enabled: true }),
      electricalEngineer,
      "work-1",
      "tech-electrical",
    );
    expect(result).toMatchObject({ claimantId: "tech-electrical", status: WorkStatus.CLAIMED });
  });

  it("rejects engineer assignment when the switch is disabled", async () => {
    await expect(
      assignWorkWithStore(fakeStore({ enabled: false }), electricalEngineer, "work-1", "tech-electrical"),
    ).rejects.toThrow("Engineer work assignment is disabled");
  });

  it("rejects a technician from another category", async () => {
    await expect(
      assignWorkWithStore(fakeStore({ enabled: true }), electricalEngineer, "work-1", "tech-mechanical"),
    ).rejects.toThrow("Technician category mismatch");
  });

  it("rejects inactive technicians and already claimed work", async () => {
    await expect(
      assignWorkWithStore(fakeStore({ technicianActive: false }), admin, "work-1", "tech-electrical"),
    ).rejects.toThrow("Technician is inactive");
    await expect(
      assignWorkWithStore(fakeStore({ claimantId: "other" }), admin, "work-1", "tech-electrical"),
    ).rejects.toThrow("CM work is no longer available");
  });

  it("writes work, history, and audit only after authorization succeeds", async () => {
    const success = fakeStore({ enabled: true });
    await assignWorkWithStore(success, electricalEngineer, "work-1", "tech-electrical");
    expect(success.writes).toEqual(["work", "status-history", "audit"]);

    const rejected = fakeStore({ enabled: false });
    await expect(
      assignWorkWithStore(rejected, electricalEngineer, "work-1", "tech-electrical"),
    ).rejects.toThrow();
    expect(rejected.writes).toEqual([]);
  });
});
