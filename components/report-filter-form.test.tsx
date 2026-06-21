import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseReportFilter } from "../modules/reports/report-filter";
import { ReportFilterForm } from "./report-filter-form";

describe("ReportFilterForm", () => {
  it("renders every filter required before export", () => {
    const filter = parseReportFilter(new URLSearchParams("mode=month&month=2026-06"), new Date("2026-06-18T17:30:00.000Z"));
    render(
      <ReportFilterForm
        categories={[{ id: "cat-1", name: "Electrical" }]}
        claimants={[{ id: "user-1", name: "Technician" }]}
        filter={filter}
        zones={[{ id: "zone-1", name: "Boiler" }]}
      />,
    );

    for (const label of ["Status", "Category", "Zone", "Urgency", "Claimant", "Requester", "Department", "Machine Name", "CM Number"]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Preview report" })).toBeTruthy();
  });
});
