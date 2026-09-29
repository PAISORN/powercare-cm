import { describe, expect, it } from "vitest";
import {
  buildPmCalendarUrl,
  resolvePmCalendarPageState,
} from "./pm-calendar-page-model";

describe("PM calendar page model", () => {
  it("uses the selected day month when day view crosses month boundaries", () => {
    expect(
      resolvePmCalendarPageState(
        { view: "day", date: "2026-10-01", month: "2026-09" },
        "2026-09-28",
      ),
    ).toEqual({
      selectedDate: "2026-10-01",
      view: "day",
      month: "2026-10-01",
    });
  });

  it("rejects invalid date and month values without normalizing them", () => {
    expect(
      resolvePmCalendarPageState(
        { view: "month", date: "2026-02-30", month: "2026-13" },
        "2026-09-28",
      ),
    ).toEqual({
      selectedDate: "2026-09-28",
      view: "month",
      month: "2026-09-01",
    });
  });

  it("preserves scope and calendar view in action redirects", () => {
    expect(
      buildPmCalendarUrl(
        {
          organization: { id: "org-a" },
          plant: { id: "plant-a" },
          calendarView: "day",
        },
        { date: "2026-09-28", saved: "created", error: undefined },
      ),
    ).toBe(
      "/dashboardpm/calendar?organizationId=org-a&plantId=plant-a&view=day&date=2026-09-28&saved=created",
    );
  });
});
