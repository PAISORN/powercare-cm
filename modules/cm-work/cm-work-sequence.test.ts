import { describe, expect, it, vi } from "vitest";
import { reserveCmWorkNumber } from "./cm-work-sequence";

describe("reserveCmWorkNumber", () => {
  it("increments the monthly database sequence and formats the reserved CM number", async () => {
    const upsert = vi.fn().mockResolvedValue({ yearMonth: "2026-06", lastNumber: 12 });
    const tx = { cmNumberSequence: { upsert } };

    const number = await reserveCmWorkNumber(tx, new Date("2026-06-16T04:00:00Z"));

    expect(number).toBe("CM-2026-06-0012");
    expect(upsert).toHaveBeenCalledWith({
      where: { yearMonth: "2026-06" },
      create: { yearMonth: "2026-06", lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
  });
});
