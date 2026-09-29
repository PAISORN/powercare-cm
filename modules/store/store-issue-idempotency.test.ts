import { describe, expect, it } from "vitest";
import { isStoreIssueSubmissionConflict } from "./store-issue-idempotency";

describe("isStoreIssueSubmissionConflict", () => {
  it("recognizes submissionKey conflicts from array and string targets", () => {
    expect(isStoreIssueSubmissionConflict({
      code: "P2002",
      meta: { target: ["submissionKey"] },
    })).toBe(true);
    expect(isStoreIssueSubmissionConflict({
      code: "P2002",
      meta: { target: "SparePartIssue_submissionKey_key" },
    })).toBe(true);
  });

  it("does not recover an unrelated unique constraint", () => {
    expect(isStoreIssueSubmissionConflict({
      code: "P2002",
      meta: { target: ["number"] },
    })).toBe(false);
  });

  it("ignores non-Prisma errors", () => {
    expect(isStoreIssueSubmissionConflict(new Error("failed"))).toBe(false);
    expect(isStoreIssueSubmissionConflict(null)).toBe(false);
  });
});
