import { beforeEach, describe, expect, it, vi } from "vitest";
const { query, execute } = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));
vi.mock("../../lib/db", () => ({ db: {
  $queryRaw: query,
  $transaction: async (callback: (transaction: unknown) => unknown) => callback({ $queryRaw: query, $executeRaw: execute }),
} }));
import { getUserDisplayPreferences, updateUserDisplayPreferences } from "./display-preferences-service";

beforeEach(() => { vi.clearAllMocks(); query.mockResolvedValue([{ displayPreferences: null }]); execute.mockResolvedValue(1); });
describe("account display preferences", () => {
  it("loads only the requested authenticated account and uses defaults for a new account", async () => {
    const preferences = await getUserDisplayPreferences("user-A");
    expect(preferences.background).toBe("image-maintenance");
    expect(query.mock.calls[0][1]).toBe("user-A");
  });
  it("merges a theme toggle without losing the account background or image controls", async () => {
    query.mockResolvedValue([{ displayPreferences: JSON.stringify({ background: "image-plant-dawn", theme: "day", backgroundBlur: 4, backgroundBrightness: 82, language: "th" }) }]);
    const result = await updateUserDisplayPreferences("user-A", { theme: "night" });
    expect(result).toMatchObject({ theme: "night", background: "image-plant-dawn", backgroundBlur: 4, backgroundBrightness: 82 });
    expect(execute.mock.calls[0][2]).toBe("user-A");
    expect(JSON.parse(execute.mock.calls[0][1])).toEqual(result);
  });
  it("rejects attempts to include a different user and invalid display values", async () => {
    for (const input of [{ userId: "user-B", theme: "night" }, { background: "https://external.test" }, { backgroundBlur: 99 }, { backgroundBrightness: NaN }, { language: "en" }]) {
      await expect(updateUserDisplayPreferences("user-A", input)).rejects.toThrow();
    }
    expect(execute).not.toHaveBeenCalled();
  });
  it("does not save a missing or inactive account", async () => {
    query.mockResolvedValue([]);
    await expect(updateUserDisplayPreferences("missing", { theme: "night" })).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });
});
