import { describe, expect, it } from "vitest";
import {
  getOpenSectionsForRoute,
  isChildOfSection,
} from "./app-navigation-route-state";
import type { AppLink } from "./app-navigation-model";

const links: AppLink[] = [
  { label: "Inventory", kind: "section", sectionId: "inventory" },
  {
    label: "Issue",
    href: "/dashboardstore/issue?view=create",
    nested: true,
    parentSectionId: "inventory",
  },
  {
    label: "Tracking",
    href: "/dashboardstore/issue?view=tracking",
    nested: true,
    parentSectionId: "inventory",
  },
  {
    label: "Nested",
    kind: "section",
    sectionId: "nested",
    parentSectionId: "inventory",
  },
  {
    label: "Nested page",
    href: "/nested",
    nested: true,
    parentSectionId: "nested",
  },
];

describe("app navigation route state", () => {
  it("opens the section matching the active pathname and query", () => {
    const params = new URLSearchParams("view=tracking");

    expect(
      getOpenSectionsForRoute(links, "/dashboardstore/issue", params),
    ).toEqual({ inventory: true });
  });

  it("opens every parent in an active nested section chain", () => {
    expect(getOpenSectionsForRoute(links, "/nested")).toEqual({
      nested: true,
      inventory: true,
    });
    expect(isChildOfSection(links, "nested", "inventory")).toBe(true);
  });
});
