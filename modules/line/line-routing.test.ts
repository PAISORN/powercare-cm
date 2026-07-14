import { describe, expect, it } from "vitest";
import { selectLineDestinations } from "./line-routing";

describe("LINE event routing", () => {
  const destinations = [
    { id: "all", categoryId: null, plantId: null, active: true, settings: [{ eventType: "CLAIMED", enabled: true }] },
    { id: "electrical", categoryId: "electrical", plantId: null, active: true, settings: [{ eventType: "CLAIMED", enabled: true }] },
    { id: "mechanical", categoryId: "mechanical", plantId: null, active: true, settings: [{ eventType: "CLAIMED", enabled: true }] },
  ];

  it("routes electrical events to all-category and electrical destinations", () => {
    const result = selectLineDestinations({ eventType: "CLAIMED", categoryId: "electrical" }, destinations);

    expect(result.map((item) => item.id)).toEqual(["all", "electrical"]);
  });

  it("excludes inactive destinations and disabled event settings", () => {
    const result = selectLineDestinations(
      { eventType: "CLOSED", categoryId: "electrical" },
      [
        { id: "inactive", categoryId: null, active: false, settings: [{ eventType: "CLOSED", enabled: true }] },
        { id: "disabled", categoryId: null, active: true, settings: [{ eventType: "CLOSED", enabled: false }] },
        { id: "enabled", categoryId: null, active: true, settings: [{ eventType: "CLOSED", enabled: true }] },
      ],
    );

    expect(result.map((item) => item.id)).toEqual(["enabled"]);
  });

  it("does not route unknown event types", () => {
    expect(selectLineDestinations({ eventType: "UNKNOWN", categoryId: null }, destinations)).toEqual([]);
  });

  it("routes plant events only to global or matching plant destinations", () => {
    const result = selectLineDestinations(
      { eventType: "CLAIMED", categoryId: "electrical", plantId: "plant-a" },
      [
        { id: "global", categoryId: null, plantId: null, active: true, settings: [{ eventType: "CLAIMED", enabled: true }] },
        { id: "plant-a", categoryId: null, plantId: "plant-a", active: true, settings: [{ eventType: "CLAIMED", enabled: true }] },
        { id: "plant-b", categoryId: null, plantId: "plant-b", active: true, settings: [{ eventType: "CLAIMED", enabled: true }] },
      ],
    );

    expect(result.map((item) => item.id)).toEqual(["global", "plant-a"]);
  });
});
