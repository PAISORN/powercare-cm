import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PmCalendar } from "./pm-calendar";
import { PmAgendaList } from "./pm-agenda-list";
import { PmCalendarViewSwitcher } from "./pm-calendar-view-switcher";
import { PmDayColumn } from "./pm-day-column";

describe("PM calendar views", () => {
  it("renders a 42-cell accessible desktop grid with compact plan summaries", () => {
    render(<PmCalendar canManage month="2026-08-01" plans={[{ id: "p", plannedDateKey: "2026-08-15", status: "DRAFT", number: null, draftGroups: [{ pmGroup: { id: "g", code: "G", name: "Group" } }], _count: { works: 0 } }]} scopeQuery="organizationId=o&plantId=s" />);
    expect(screen.getByRole("grid")).toBeTruthy(); expect(screen.getAllByRole("row")).toHaveLength(7); expect(screen.getAllByRole("columnheader")).toHaveLength(7); expect(screen.getAllByRole("gridcell")).toHaveLength(42); expect(screen.getByText("1 PM Groups")).toBeTruthy(); expect(screen.queryByText("Pump asset one")).toBeNull();
  });
  it("renders the mobile agenda as a separate labelled layout", () => { render(<PmAgendaList canManage month="2026-08-01" plans={[]} scopeQuery="organizationId=o&plantId=s" />); expect(screen.getByRole("region", { name: "รายการแผน PM รายวัน" }).className).toContain("md:hidden"); });
  it("offers explicit month and day views with the active state", () => {
    render(<PmCalendarViewSwitcher view="day" monthHref="/dashboardpm?view=month" dayHref="/dashboardpm?view=day" />);
    expect(screen.getByRole("navigation", { name: "รูปแบบปฏิทิน PM" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "รายวัน" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "ภาพรวมเดือน" }).getAttribute("href")).toContain("view=month");
  });
  it("renders one all-day column without inventing hourly PM times", () => {
    const plan = { id: "p", plannedDateKey: "2026-08-15", status: "CONFIRMED", number: "PMP-S01-20260815-001", draftGroups: [], groupSnapshots: [{ id: "g", codeSnapshot: "PUMP", nameSnapshot: "Pump room" }], _count: { works: 2 } };
    render(<PmDayColumn canManage date="2026-08-15" plan={plan} scopeQuery="organizationId=o&plantId=s" today="2026-08-20" />);
    expect(screen.getByRole("region", { name: "ปฏิทิน PM รายวัน" })).toBeTruthy();
    expect(screen.getByText("ทั้งวัน")).toBeTruthy();
    expect(screen.getByText("ไม่ระบุเวลา", { exact: false })).toBeTruthy();
    expect(screen.getByText("PUMP · Pump room")).toBeTruthy();
    expect(screen.getByRole("link", { name: "วันถัดไป" }).getAttribute("href")).toContain("date=2026-08-16");
  });
});
