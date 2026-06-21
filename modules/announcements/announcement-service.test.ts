import { describe, expect, it } from "vitest";
import { RoleName } from "../cm-work/cm-work-types";
import {
  createAnnouncementWithStore,
  isAnnouncementNew,
  isAnnouncementVisible,
  type AnnouncementStore,
} from "./announcement-service";

const now = new Date("2026-06-18T05:00:00Z");

function createStore(): AnnouncementStore & { created: unknown[]; audits: string[] } {
  const created: unknown[] = [];
  const audits: string[] = [];
  return {
    created,
    audits,
    async create(data) {
      created.push(data);
      return { id: "announcement-1", ...data, createdAt: now, updatedAt: now };
    },
    async audit(action) {
      audits.push(action);
    },
  };
}

describe("announcement scheduling", () => {
  it("shows active announcements only inside the publish window", () => {
    const visible = {
      active: true,
      publishStart: new Date("2026-06-17T00:00:00Z"),
      publishEnd: new Date("2026-06-20T00:00:00Z"),
    };
    expect(isAnnouncementVisible(visible, now)).toBe(true);
    expect(isAnnouncementVisible({ ...visible, active: false }, now)).toBe(false);
    expect(isAnnouncementVisible({ ...visible, publishStart: new Date("2026-06-19T00:00:00Z") }, now)).toBe(false);
  });

  it("marks the first three Bangkok publish days as new", () => {
    expect(isAnnouncementNew(new Date("2026-06-16T00:00:00Z"), now)).toBe(true);
    expect(isAnnouncementNew(new Date("2026-06-14T00:00:00Z"), now)).toBe(false);
    expect(isAnnouncementNew(new Date("2026-06-19T00:00:00Z"), now)).toBe(false);
  });

  it("allows only admin to create a valid publish window and records audit", async () => {
    const store = createStore();
    const input = {
      title: "Plant notice",
      content: "Maintenance window",
      publishStart: new Date("2026-06-18T00:00:00Z"),
      publishEnd: new Date("2026-06-20T00:00:00Z"),
      pinned: true,
      active: true,
    };
    await createAnnouncementWithStore(
      store,
      { id: "admin", role: RoleName.ADMIN, categoryId: null },
      input,
    );
    expect(store.created).toHaveLength(1);
    expect(store.audits).toEqual(["CREATE_ANNOUNCEMENT"]);

    await expect(
      createAnnouncementWithStore(
        createStore(),
        { id: "engineer", role: RoleName.ENGINEER, categoryId: "electrical" },
        input,
      ),
    ).rejects.toThrow("Only admin can manage announcements");
  });

  it("rejects an end date before the start date", async () => {
    await expect(
      createAnnouncementWithStore(
        createStore(),
        { id: "admin", role: RoleName.ADMIN, categoryId: null },
        {
          title: "Invalid",
          content: "Invalid range",
          publishStart: new Date("2026-06-20T00:00:00Z"),
          publishEnd: new Date("2026-06-18T00:00:00Z"),
          pinned: false,
          active: true,
        },
      ),
    ).rejects.toThrow("Publish end must be on or after publish start");
  });

  it("accepts a preallocated id for image storage consistency", async () => {
    const store = createStore();
    await createAnnouncementWithStore(
      store,
      { id: "admin", role: RoleName.ADMIN, categoryId: null },
      {
        title: "Image notice",
        content: "Uses a stable id",
        publishStart: new Date("2026-06-18T00:00:00Z"),
        publishEnd: new Date("2026-06-20T00:00:00Z"),
        pinned: false,
        active: true,
      },
      "fixed-announcement-id",
    );
    expect(store.created[0]).toMatchObject({ id: "fixed-announcement-id" });
  });
});
