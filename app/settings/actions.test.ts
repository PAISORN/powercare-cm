import { beforeEach, describe, expect, it, vi } from "vitest";
const { requireUser, update } = vi.hoisted(() => ({ requireUser: vi.fn(), update: vi.fn() }));
vi.mock("../../lib/session", () => ({ requireUser }));
vi.mock("../../modules/settings/display-preferences-service", () => ({ updateUserDisplayPreferences: update }));
import { saveDisplayPreferences } from "./actions";
beforeEach(() => { vi.clearAllMocks(); requireUser.mockResolvedValue({ id: "session-user" }); update.mockResolvedValue({ theme: "night" }); });
describe("save own settings", () => {
  it("derives the destination user from the session, never the form", async () => {
    expect((await saveDisplayPreferences({ theme: "night" }, "session-user")).ok).toBe(true);
    expect(update).toHaveBeenCalledWith("session-user", { theme: "night" });
  });
  it("requires authentication before writing", async () => {
    requireUser.mockRejectedValue(new Error("authentication required"));
    await expect(saveDisplayPreferences({ theme: "night" }, "session-user")).rejects.toThrow("authentication required");
    expect(update).not.toHaveBeenCalled();
  });
  it("returns an error rather than success when saving fails", async () => {
    update.mockRejectedValue(new Error("database unavailable"));
    expect((await saveDisplayPreferences({ theme: "night" }, "session-user")).ok).toBe(false);
  });
  it("rejects a stale form belonging to an account that logged out in another tab", async () => {
    expect((await saveDisplayPreferences({ theme: "night" }, "previous-account")).ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
