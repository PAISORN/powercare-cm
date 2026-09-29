import { describe, expect, it } from "vitest";
import {
  activityBoardRedirect,
  activityBoardType,
  activityCloseHref,
  filterActivityBoardItems,
  resolveActivityBoardFilters,
} from "./activity-page-model";
import type { ActivityFeedItem, ActivityScope } from "./activity-types";

const scope = {
  organization: { id: "org-1" },
  plant: { id: "site-1" },
} as ActivityScope;

const work = (status: string, title: string, occurredAt: string) =>
  ({
    kind: "work",
    key: title,
    title,
    subtitle: "Pump · Mechanical",
    status,
    occurredAt: new Date(occurredAt),
    work: { machineName: "Pump A" },
  }) as ActivityFeedItem;

describe("activity page model", () => {
  it("normalizes invalid filters and preserves them in board URLs", () => {
    const filters = resolveActivityBoardFilters({
      activityPage: "-2",
      activitySearch: " Pump ",
      activitySort: "oldest",
      activityType: "unknown",
    });
    expect(filters).toEqual({
      page: 1,
      search: "Pump",
      sort: "oldest",
      status: "all",
      type: "all",
    });
    expect(activityBoardRedirect(scope, filters)).toContain(
      "organizationId=org-1&plantId=site-1",
    );
    expect(activityCloseHref(scope, filters, "current")).toContain(
      "activityView=current",
    );
  });

  it("filters, classifies, and orders combined activities", () => {
    const items = [
      work("IN_PROGRESS", "CM-2", "2026-01-02"),
      work("WAITING_TO_CLOSE", "CM-1", "2026-01-01"),
    ];
    expect(activityBoardType(items[1])).toBe("review");
    expect(
      filterActivityBoardItems(items, {
        page: 1,
        search: "pump",
        sort: "oldest",
        status: "all",
        type: "all",
      }).map((item) => item.title),
    ).toEqual(["CM-1", "CM-2"]);
  });
});
