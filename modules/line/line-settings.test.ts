import { describe, expect, it } from "vitest";
import { maskLineTargetId, parseLineDestinationInput, resolveLineDiscoveryPrefill } from "./line-settings";

describe("LINE destination settings", () => {
  it("creates an inactive prefill for an unlinked discovered group", () => {
    expect(
      resolveLineDiscoveryPrefill({
        id: "d1",
        groupId: "C123456789",
        displayName: "CM Test",
        addedDestinationId: null,
      }),
    ).toEqual({
      discoveryId: "d1",
      displayName: "CM Test",
      targetId: "C123456789",
      active: false,
    });
  });

  it("does not prefill a discovery already linked to a destination", () => {
    expect(
      resolveLineDiscoveryPrefill({
        id: "d1",
        groupId: "C1",
        displayName: null,
        addedDestinationId: "destination-1",
      }),
    ).toBeNull();
  });

  it("normalizes an Admin destination and selected events", () => {
    const input = parseLineDestinationInput({
      displayName: " Electrical team ",
      targetId: " C123456789 ",
      categoryId: "electrical",
      active: true,
      enabledEvents: ["NEW_REQUEST", "CLOSED", "UNKNOWN"],
    });

    expect(input).toEqual({
      displayName: "Electrical team",
      targetId: "C123456789",
      categoryId: "electrical",
      active: true,
      enabledEvents: ["NEW_REQUEST", "CLOSED"],
    });
  });

  it("rejects an empty target ID", () => {
    expect(() =>
      parseLineDestinationInput({
        displayName: "Operations",
        targetId: " ",
        categoryId: null,
        active: true,
        enabledEvents: [],
      }),
    ).toThrow("LINE target ID is required");
  });

  it("masks saved target IDs except the last four characters", () => {
    expect(maskLineTargetId("C123456789")).toBe("••••••6789");
  });
});
