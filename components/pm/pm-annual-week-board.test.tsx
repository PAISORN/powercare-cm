import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PmAnnualWeekBoard } from "./pm-annual-week-board";

describe("PmAnnualWeekBoard", () => {
  it("shows the Main Asset count beside every target name in a day with multiple PM entries", () => {
    render(<PmAnnualWeekBoard
      action={async () => {}}
      days={[{
        date: "2027-01-03",
        weekday: "Sun",
        href: "/dashboardpm/setup?date=2027-01-03",
        markers: [],
        items: [
          { id: "one", label: "Boiler", status: "SCHEDULED", mainAssetCount: 3, color: { backgroundColor: "red", borderColor: "red", color: "black" } },
          { id: "two", label: "Turbine", status: "SCHEDULED", mainAssetCount: 2, color: { backgroundColor: "blue", borderColor: "blue", color: "black" } },
        ],
      }]}
      hidden={{ organizationId: "org", plantId: "site", planId: "plan", year: 2027, month: 1 }}
      positionKey="pm-test"
    />);
    expect(screen.getByText("Boiler")).toBeTruthy();
    expect(screen.getByText("Turbine")).toBeTruthy();
    expect(screen.getByLabelText("Main Assets 3").textContent).toBe("3");
    expect(screen.getByLabelText("Main Assets 2").textContent).toBe("2");
    expect(screen.getByRole("grid", { name: "ตารางเวลา PM รายสัปดาห์" })).toBeTruthy();
    expect(screen.getByText("09:00–12:00")).toBeTruthy();
    expect(screen.getByText("14:00–17:00")).toBeTruthy();
    expect(screen.getByText("Boiler").closest("[data-time-slot]")?.getAttribute("data-time-slot")).toBe("09:00-12:00");
    expect(screen.getByText("Turbine").closest("[data-time-slot]")?.getAttribute("data-time-slot")).toBe("14:00-17:00");
  });
});
