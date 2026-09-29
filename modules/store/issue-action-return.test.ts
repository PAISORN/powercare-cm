import { describe, expect, it } from "vitest";
import {
  issueHrefWithFeedback,
  safeIssueReturnTo,
} from "./issue-action-return";

const scope = { organizationId: "org 1", plantId: "plant/1" };
const scopedHref =
  "/dashboardstore/issue?organizationId=org+1&plantId=plant%2F1&view=tracking";

describe("Issue action return URL", () => {
  it("keeps tracking filters, page, and row hash for the selected scope", () => {
    const requested = `${scopedHref}&itemKind=CHEMICAL&q=seal&status=WAITING&trackingPage=3#issue-row-1`;

    expect(safeIssueReturnTo(scope, requested)).toBe(requested);
    expect(issueHrefWithFeedback(requested, "saved", "decision")).toBe(
      `${scopedHref}&itemKind=CHEMICAL&q=seal&status=WAITING&trackingPage=3&saved=decision#issue-row-1`,
    );
  });

  it("rejects a return URL outside the resolved organization and plant", () => {
    expect(
      safeIssueReturnTo(
        scope,
        "/dashboardstore/issue?organizationId=other&plantId=other&view=tracking",
      ),
    ).toBe(scopedHref);
    expect(safeIssueReturnTo(scope, `https://example.com${scopedHref}`)).toBe(
      scopedHref,
    );
    expect(
      safeIssueReturnTo(
        scope,
        "/dashboardstore/stock?organizationId=org+1&plantId=plant%2F1&view=tracking",
      ),
    ).toBe(scopedHref);
  });

  it("encodes action feedback without losing the row hash", () => {
    expect(issueHrefWithFeedback(scopedHref, "error", "ลองใหม่ อีกครั้ง")).toBe(
      `${scopedHref}&error=${encodeURIComponent("ลองใหม่ อีกครั้ง")}`,
    );
  });
});
