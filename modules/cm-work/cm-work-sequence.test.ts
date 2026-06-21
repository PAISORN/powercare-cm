import { describe, expect, it, vi } from "vitest";
import { reserveCmWorkNumber } from "./cm-work-sequence";

describe("reserveCmWorkNumber", () => {
  it("increments the monthly database sequence and formats the reserved CM number", async () => {
    const findUnique = vi.fn().mockResolvedValue({ yearMonth: "2026-06", lastNumber: 11 });
    const upsert = vi.fn().mockResolvedValue({ yearMonth: "2026-06", lastNumber: 12 });
    const findMany = vi.fn();
    const tx = { cmNumberSequence: { findUnique, upsert }, cmWork: { findMany } };

    const number = await reserveCmWorkNumber(tx, new Date("2026-06-16T04:00:00Z"));

    expect(number).toBe("CM-2026-06-0012");
    expect(findMany).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith({
      where: { yearMonth: "2026-06" },
      create: { yearMonth: "2026-06", lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
  });

  it("starts after the highest imported number when the monthly sequence is missing", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const findMany = vi.fn().mockResolvedValue([
      { number: "CM-2026-06-0001" },
      { number: "CM-2026-06-9050" },
      { number: "CM-2026-06-invalid" },
    ]);
    const upsert = vi.fn().mockResolvedValue({ yearMonth: "2026-06", lastNumber: 9051 });
    const tx = { cmNumberSequence: { findUnique, upsert }, cmWork: { findMany } };

    const number = await reserveCmWorkNumber(tx, new Date("2026-06-20T01:00:00Z"));

    expect(number).toBe("CM-2026-06-9051");
    expect(findMany).toHaveBeenCalledWith({
      where: { number: { startsWith: "CM-2026-06-" } },
      select: { number: true },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { yearMonth: "2026-06" },
      create: { yearMonth: "2026-06", lastNumber: 9051 },
      update: { lastNumber: { increment: 1 } },
    });
  });
});
