import { describe, expect, it } from "vitest";
import { storeIssueActionError } from "./store-issue-action-error";

describe("storeIssueActionError", () => {
  const fallback = "ไม่สามารถดำเนินการได้";

  it.each([
    "Requested quantity exceeds available stock.",
    "CM number was not found in the selected Site.",
    "You do not have permission to perform this Store action.",
    "Oil issue readings are required and must not be negative.",
  ])("returns an expected Store Issue error: %s", (message) => {
    expect(storeIssueActionError(new Error(message), fallback)).toBe(message);
  });

  it("hides unexpected infrastructure errors", () => {
    expect(
      storeIssueActionError(
        new Error("Prisma connection failed at db.internal:5432"),
        fallback,
      ),
    ).toBe(fallback);
  });

  it("uses the fallback for non-Error values", () => {
    expect(storeIssueActionError("failed", fallback)).toBe(fallback);
  });
});
