import { describe, expect, it } from "vitest";
import { StoreIssueStatus } from "./store-types";
import {
  buildIssueTrackingInspectHref,
  buildIssueTrackingPageHref,
  buildIssueTrackingPositionKey,
  buildIssueTrackingStatusHref,
  clampIssueTrackingPage,
  countIssueTrackingFilters,
  issueTrackingStatusGroup,
  issueTrackingStatusValues,
  parseIssueTrackingQuery,
} from "./issue-tracking-query";

const scope = { organizationId: "org 1", plantId: "plant/1" };

describe("Issue tracking query contract", () => {
  it("normalizes supported filters and page values", () => {
    expect(
      parseIssueTrackingQuery(
        {
          q: "  bearing  ",
          status: "IN_PROGRESS",
          itemKind: "CHEMICAL",
          trackingPage: "3",
          inspectIssueId: " issue-1 ",
        },
        "SPARE_PART",
      ),
    ).toEqual({
      search: "bearing",
      status: "IN_PROGRESS",
      itemKind: "CHEMICAL",
      page: 3,
      inspectIssueId: "issue-1",
    });
  });

  it("falls back safely and clamps pages to available results", () => {
    expect(
      parseIssueTrackingQuery(
        { status: "UNKNOWN", itemKind: "FUEL", trackingPage: "-2" },
        "OIL",
      ),
    ).toEqual({ search: "", status: "ALL", itemKind: "OIL", page: 1 });
    expect(clampIssueTrackingPage(5, 3)).toBe(3);
    expect(clampIssueTrackingPage(0, 0)).toBe(1);
  });

  it("preserves semantic list state across pages and the inspection drawer", () => {
    const query = parseIssueTrackingQuery(
      {
        q: "pump seal",
        status: "WAITING",
        itemKind: "SPARE_PART",
        trackingPage: "4",
      },
      "OIL",
    );

    expect(buildIssueTrackingPageHref(scope, query, 2)).toBe(
      "/dashboardstore/issue?organizationId=org+1&plantId=plant%2F1&view=tracking&itemKind=SPARE_PART&q=pump+seal&status=WAITING&trackingPage=2#issue-tracking",
    );
    expect(buildIssueTrackingStatusHref(scope, query, "COMPLETED")).toBe(
      "/dashboardstore/issue?organizationId=org+1&plantId=plant%2F1&view=tracking&itemKind=SPARE_PART&q=pump+seal&status=COMPLETED#issue-tracking",
    );
    expect(buildIssueTrackingInspectHref(scope, query, "issue/1")).toBe(
      "/dashboardstore/issue?organizationId=org+1&plantId=plant%2F1&view=tracking&itemKind=SPARE_PART&q=pump+seal&status=WAITING&trackingPage=4&inspectIssueId=issue%2F1",
    );
    expect(buildIssueTrackingPositionKey(scope)).toBe(
      "store-issues:org 1:plant/1",
    );
    expect(countIssueTrackingFilters(query, "OIL")).toBe(3);
  });

  it("maps lifecycle statuses to the tracking groups", () => {
    expect(issueTrackingStatusValues("WAITING")).toEqual([
      StoreIssueStatus.WAITING_ENGINEER_APPROVAL,
    ]);
    expect(issueTrackingStatusValues("ALL")).toBeNull();
    expect(issueTrackingStatusGroup(StoreIssueStatus.PARTIALLY_ISSUED)).toBe(
      "IN_PROGRESS",
    );
    expect(issueTrackingStatusGroup(StoreIssueStatus.ISSUED)).toBe("COMPLETED");
    expect(issueTrackingStatusGroup(StoreIssueStatus.CANCELED)).toBe(
      "CANCELED",
    );
  });
});
