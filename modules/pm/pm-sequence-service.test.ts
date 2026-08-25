import { describe, expect, it, vi } from "vitest";
import { reservePmPlanSequence } from "./pm-sequence-service";

describe("PM plan sequence reservation", () => {
  it("reserves by normalized Site segment and Bangkok creation date", async () => {
    const upsert = vi.fn().mockResolvedValue({ lastNumber: 7 });
    const result = await reservePmPlanSequence({ pmPlanSequence: { upsert } }, " rt-b ", "2026-08-15");
    expect(upsert).toHaveBeenCalledWith({
      where: { siteCodeSegment_creationDateKey: { siteCodeSegment: "RTB", creationDateKey: "2026-08-15" } },
      create: { siteCodeSegment: "RTB", creationDateKey: "2026-08-15", lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
      select: { lastNumber: true },
    });
    expect(result.planNumber).toBe("PMP-RTB-20260815-007");
    expect(result.workNumber(2)).toBe("PM-RTB-20260815-007-002");
  });
});
