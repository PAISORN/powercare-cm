import { describe, expect, it, vi } from "vitest";
import { NotificationEventType } from "../notifications/notification-types";
import {
  buildPmNotificationDispatchKey,
  createPmDueOverdueDispatcher,
  createPmNotifications,
  dispatchCurrentPmWorkNotification,
  getPmNotificationRecipientIds,
  notifyPmAssignment,
} from "./pm-notification-service";

const work = {
  id: "pm-1",
  number: "PM-001",
  status: "PLANNED",
  plantId: "site-1",
  pmPlan: { organizationId: "org-1", plannedDateKey: "2026-08-15" },
  assignees: [{ userId: "tech-1" }],
};

describe("PM notification service", () => {
  it("builds a persistent recipient/event/work/date idempotency key", () => {
    expect(buildPmNotificationDispatchKey("u1", "PM_DUE_TODAY", "w1", "2026-08-15")).toBe("PM:u1:PM_DUE_TODAY:w1:2026-08-15");
  });

  it("selects assignees and scoped managers without CM category recipients", async () => {
    const users = [
      { id: "owner", role: "ADMIN", organizationId: null, plantId: null, siteAdminPermissions: [], userPermissionOverrides: [{ userId: "owner", permissionKey: "manage_pm_plans", decision: "DENY" }] },
      { id: "org-admin", role: "ORGANIZATION_ADMIN", organizationId: "org-1", plantId: null, siteAdminPermissions: [], userPermissionOverrides: [] },
      { id: "denied-org-admin", role: "ORGANIZATION_ADMIN", organizationId: "org-1", plantId: null, siteAdminPermissions: [], userPermissionOverrides: [{ userId: "denied-org-admin", permissionKey: "manage_pm_plans", decision: "DENY" }] },
      { id: "legacy-site-admin", role: "PLANT_ADMIN", organizationId: "org-1", plantId: "site-1", siteAdminPermissions: [{ userId: "legacy-site-admin", plantId: "site-1", permissionKey: "manage_pm_plans", enabled: true }], userPermissionOverrides: [] },
      { id: "granted-tech", role: "TECHNICIAN", organizationId: "org-1", plantId: "site-1", siteAdminPermissions: [], userPermissionOverrides: [{ userId: "granted-tech", permissionKey: "manage_pm_plans", decision: "ALLOW" }] },
      { id: "category-tech", role: "TECHNICIAN", organizationId: "org-1", plantId: "site-1", siteAdminPermissions: [], userPermissionOverrides: [] },
    ];
    const tx = { user: { findMany: vi.fn().mockResolvedValue(users) }, rolePermissionOverride: { findMany: vi.fn().mockResolvedValue([]) } } as never;
    await expect(getPmNotificationRecipientIds(tx, work)).resolves.toEqual(["tech-1", "owner", "org-admin", "legacy-site-admin", "granted-tech"]);
    expect((tx as { user: { findMany: ReturnType<typeof vi.fn> } }).user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ role: "ADMIN" }), expect.objectContaining({ organizationId: "org-1" })]) }),
    }));
  });

  it("uses conflict-safe upsert instead of catching P2002 inside a transaction", async () => {
    let call = 0;
    const upsert = vi.fn().mockImplementation(args => Promise.resolve({ id: call++ === 0 ? args.create.id : "existing-id" }));
    const tx = { userNotification: { upsert } } as never;
    const created = await createPmNotifications({
      eventType: NotificationEventType.PM_DUE_TODAY, pmWorkId: "pm-1", pmNumber: "PM-001", organizationId: "org-1", plantId: "site-1", targetStatus: "PLANNED", title: "Due", message: "Due", href: "/dashboardpm/work/pm-1", recipientIds: ["u1", "u2"], eventDateKey: "2026-08-15",
    }, tx, { idempotent: true });
    expect(created).toBe(1);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { dispatchKey: "PM:u1:PM_DUE_TODAY:pm-1:2026-08-15" }, create: expect.objectContaining({ entityType: "PmWork" }), update: {} }));
  });

  it("emits assignment then reassignment events to current assignees", async () => {
    const create = vi.fn().mockResolvedValue({});
    const tx = { userNotification: { create }, user: { findMany: vi.fn().mockResolvedValue([{ id: "manager-1", role: "SITE_ADMIN", organizationId: "org-1", plantId: "site-1", siteAdminPermissions: [], userPermissionOverrides: [] }]) }, rolePermissionOverride: { findMany: vi.fn().mockResolvedValue([]) } } as never;
    await notifyPmAssignment(tx, work, [], new Date("2026-08-15T03:00:00Z"));
    await notifyPmAssignment(tx, work, ["old-user"], new Date("2026-08-15T03:00:00Z"));
    expect(create.mock.calls.map(call => call[0].data.eventType)).toEqual([NotificationEventType.PM_ASSIGNED, NotificationEventType.PM_ASSIGNED, NotificationEventType.PM_REASSIGNED, NotificationEventType.PM_REASSIGNED]);
    expect(create.mock.calls[0][0].data.message).toContain("You are assigned");
    expect(create.mock.calls[1][0].data.message).toContain("assignment was updated");
  });

  it("dispatches due today and first-overdue using the stable planned date", async () => {
    const keys = new Set<string>();
    const dispatch = vi.fn(async (item, eventType, date) => {
      const key = `${item.id}:${eventType}:${date}`;
      if (keys.has(key)) return 0;
      keys.add(key);
      return 1;
    });
    const findWorks = vi.fn().mockResolvedValue([work, { ...work, id: "pm-2", pmPlan: { ...work.pmPlan, plannedDateKey: "2026-08-14" } }]);
    const run = createPmDueOverdueDispatcher({ findWorks, dispatch });
    const first = await run({ now: new Date("2026-08-15T03:00:00Z") });
    const second = await run({ now: new Date("2026-08-15T04:00:00Z") });
    expect(first.created).toBe(2);
    expect(second.created).toBe(0);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ id: "pm-2" }), NotificationEventType.PM_OVERDUE, "2026-08-14");
  });

  it("re-reads eligibility and current recipients inside each work transaction", async () => {
    const upsert = vi.fn().mockImplementation(args => ({ id: args.create.id }));
    const tx = { pmWork: { findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ ...work, assignees: [{ userId: "current-tech" }] }) }, user: { findMany: vi.fn().mockResolvedValue([]) }, rolePermissionOverride: { findMany: vi.fn().mockResolvedValue([]) }, userNotification: { upsert } } as never;
    await expect(dispatchCurrentPmWorkNotification(tx, "pm-1", "2026-08-15")).resolves.toBe(0);
    await expect(dispatchCurrentPmWorkNotification(tx, "pm-1", "2026-08-15")).resolves.toBe(1);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ recipientId: "current-tech" }) }));
  });

  it("continues later works after an error before reporting the batch failure", async () => {
    const dispatch = vi.fn().mockRejectedValueOnce(new Error("first failed")).mockResolvedValueOnce(1);
    const run = createPmDueOverdueDispatcher({ findWorks: vi.fn().mockResolvedValue([work, { ...work, id: "pm-2" }]), dispatch });
    await expect(run({ now: new Date("2026-08-15T03:00:00Z") })).rejects.toThrow("1 work");
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});
