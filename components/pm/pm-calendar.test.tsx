import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { annualPmCalendarHref, PmCalendar } from "./pm-calendar";
import { PmAgendaList } from "./pm-agenda-list";
import { PmCalendarViewSwitcher } from "./pm-calendar-view-switcher";
import { PmDayColumn } from "./pm-day-column";

describe("PM calendar views", () => {
  it("renders a Sunday-to-Saturday calendar without the embedded PMP plan card", () => {
    render(
      <PmCalendar
        canManage
        month="2026-08-01"
        plans={[
          {
            id: "p",
            plannedDateKey: "2026-08-15",
            status: "DRAFT",
            number: null,
            draftGroups: [{ pmGroup: { id: "g", code: "G", name: "Group" } }],
            _count: { works: 0 },
            annualReleaseBatch: { id: "batch" },
          },
        ]}
        scopeQuery="organizationId=o&plantId=s"
        today="2026-08-20"
        viewSwitcher={{
          dayHref: "/dashboardpm/calendar?view=day",
          monthHref: "/dashboardpm/calendar?view=month",
          view: "month",
        }}
      />,
    );
    const scheduleHeading = screen.getByText("Monthly PM Schedule");
    const viewHeading = screen.getByText("Calendar view");
    const monthHeading = screen.getByText("สิงหาคม 2569");
    const calendarControls = viewHeading.closest("section");
    expect(
      screen.getByRole("heading", {
        name: "แผนบำรุงรักษาเชิงป้องกันประจำเดือน",
      }),
    ).toBeTruthy();
    expect(scheduleHeading.closest("header")?.className).not.toContain(
      "border",
    );
    expect(viewHeading.closest("section")?.className).not.toContain("border");
    expect(
      scheduleHeading.compareDocumentPosition(viewHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "เปลี่ยนเดือนปฏิทิน" })
        .parentElement,
    ).toBe(
      screen.getByRole("navigation", { name: "รูปแบบปฏิทิน PM" }).parentElement,
    );
    expect(
      screen.getByRole("navigation", { name: "รูปแบบปฏิทิน PM" }).className,
    ).toContain("rounded-full");
    expect(screen.getByRole("link", { name: "Month" }).className).toContain(
      "rounded-full",
    );
    expect(viewHeading.parentElement).toBe(monthHeading.parentElement);
    expect(calendarControls?.textContent).toContain("วันที่มี PM");
    expect(calendarControls?.textContent).toContain("Annual PM");
    expect(calendarControls?.textContent).toContain("PM Works");
    expect(document.querySelector("[data-pm-calendar-separator]")).toBeTruthy();
    expect(screen.getByRole("grid").className).toContain("lg:grid-cols-7");
    expect(screen.getAllByRole("row")).toHaveLength(7);
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(
      screen
        .getAllByRole("columnheader")
        .every((item) => item.className.includes("rounded-full")),
    ).toBe(true);
    expect(screen.getByText("วันที่มี PM").parentElement?.className).toContain(
      "rounded-full",
    );
    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
    expect(
      screen.getAllByRole("columnheader").map((item) => item.textContent),
    ).toEqual([
      "อาทิตย์",
      "จันทร์",
      "อังคาร",
      "พุธ",
      "พฤหัสบดี",
      "ศุกร์",
      "เสาร์",
    ]);
    expect(document.querySelector("[data-pm-plan-card]")).toBeNull();
    const emptyDay = screen.getByRole("gridcell", {
      name: "1 สิงหาคม 2569 เลือกวันเพื่อสร้างแผน",
    });
    expect(emptyDay.className).toContain("lg:h-[156px]");
    expect(emptyDay.className).toContain("from-[#f3f6f8]");
    const saturdayWithPlan = screen.getByRole("gridcell", {
      name: "15 สิงหาคม 2569 มีแผน 1 กลุ่ม",
    });
    expect(saturdayWithPlan.className).toContain("from-[#f7f4fc]");
    expect(saturdayWithPlan.className).toContain("text-[#17213b]");
    expect(screen.queryByText("1 PM Groups")).toBeNull();
    expect(screen.queryByText("Draft PM Plan")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Today" }).getAttribute("href"),
    ).toContain("date=2026-08-20");
    expect(screen.queryByText("Pump asset one")).toBeNull();
    expect(screen.queryByText("ANNUAL")).toBeNull();
  });
  it("renders the colored Annual PM target items in both month and day views", () => {
    const annualEntries = [
      {
        id: "s1",
        planId: "annual",
        planStatus: "DRAFT",
        scheduleDateKey: "2026-08-15",
        status: "SCHEDULED",
        targetId: "sys",
        targetName: "Boiler & Combustion Processing System",
        mainAssetCount: 3,
        workTotal: 3,
        workCompleted: 2,
        assignees: [
          {
            id: "tech",
            fullName: "Somchai Tech",
            hasPhoto: false,
            photoVersion: null,
          },
        ],
      },
      {
        id: "s2",
        planId: "annual",
        planStatus: "DRAFT",
        scheduleDateKey: "2026-08-15",
        status: "SCHEDULED",
        targetId: "zone",
        targetName: "Water Treatment",
        mainAssetCount: 2,
        workTotal: 1,
        workCompleted: 1,
      },
      {
        id: "s3",
        planId: "annual",
        planStatus: "DRAFT",
        scheduleDateKey: "2026-08-15",
        status: "SCHEDULED",
        targetId: "cooling",
        targetName: "Cooling Water",
        mainAssetCount: 5,
      },
    ];
    const { unmount } = render(
      <PmCalendar
        annualEntries={annualEntries}
        canManage
        month="2026-08-01"
        plans={[]}
        scopeQuery="organizationId=o&plantId=s"
        today="2026-08-20"
      />,
    );
    const longTargetName = screen.getByText(
      "Boiler & Combustion Processing System",
    );
    expect(longTargetName.className).toContain("truncate");
    expect(longTargetName.closest("a")?.getAttribute("title")).toBe(
      "Boiler & Combustion Processing System",
    );
    expect(longTargetName.closest("a")?.className.split(" ")).not.toContain(
      "border",
    );
    expect(longTargetName.closest("a")?.getAttribute("style")).toContain(
      "--pm-target-glow",
    );
    expect(screen.getByText("Water Treatment")).toBeTruthy();
    expect(screen.queryByText("Cooling Water")).toBeNull();
    expect(screen.getByLabelText("Main Assets 3").textContent).toBe("3");
    expect(screen.getByText("Somchai Tech")).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText("15/08/2026")).toBeTruthy();
    expect(screen.getByText("พร้อมเริ่ม PM")).toBeTruthy();
    const overflowLink = screen.getByRole("link", {
      name: "ดูรายการ PM อีก 1 รายการในวันที่ 2026-08-15",
    });
    expect(overflowLink.getAttribute("href")).toContain("view=day");
    unmount();
    render(
      <PmDayColumn
        annualEntries={annualEntries}
        canManage
        date="2026-08-15"
        scopeQuery="organizationId=o&plantId=s"
        today="2026-08-20"
      />,
    );
    expect(
      screen.getByText("Boiler & Combustion Processing System"),
    ).toBeTruthy();
    expect(screen.getByText("Water Treatment")).toBeTruthy();
    expect(screen.getByText("Cooling Water")).toBeTruthy();
    expect(screen.queryByText("ยังไม่มีแผน PM ในวันนี้")).toBeNull();
  });

  it("opens the selected Active target in a start-PM popup and Released targets in their Main Asset list", () => {
    const annualEntries = [
      {
        id: "active",
        planId: "annual",
        planStatus: "ACTIVE",
        scheduleDateKey: "2026-08-15",
        status: "SCHEDULED",
        targetId: "sys",
        targetName: "Boiler",
        mainAssetCount: 3,
      },
      {
        id: "released",
        planId: "annual",
        planStatus: "ACTIVE",
        scheduleDateKey: "2026-08-15",
        status: "RELEASED",
        targetId: "zone",
        targetName: "Water Treatment",
        mainAssetCount: 2,
        releasePmPlanId: "daily-plan",
      },
    ];
    render(
      <PmDayColumn
        annualEntries={annualEntries}
        canManage
        date="2026-08-15"
        scopeQuery="organizationId=o&plantId=s"
        today="2026-08-20"
      />,
    );
    expect(
      screen
        .getByRole("link", { name: /Boiler.*เริ่มดำเนินการ PM/ })
        .getAttribute("href"),
    ).toContain("scheduleId=active&release=annual");
    expect(
      screen
        .getByRole("link", { name: /Water Treatment.*ดู Main Assets/ })
        .getAttribute("href"),
    ).toContain("/dashboardpm/annual/released?");
  });

  it("builds the start-PM popup route for a Draft Annual target", () => {
    const annualEntry = {
      id: "draft",
      planId: "annual",
      planStatus: "DRAFT",
      scheduleDateKey: "2026-08-15",
      status: "SCHEDULED",
      targetId: "sys",
      targetName: "Boiler",
      mainAssetCount: 3,
    };
    const href = annualPmCalendarHref(
      annualEntry,
      "organizationId=o&plantId=s",
    );
    expect(href).toContain("view=month");
    expect(href).toContain("scheduleId=draft&release=annual");
  });

  it("keeps Active targets read-only for users without PM management permission", () => {
    const annualEntries = [
      {
        id: "active",
        planId: "annual",
        planStatus: "ACTIVE",
        scheduleDateKey: "2026-08-15",
        status: "SCHEDULED",
        targetId: "sys",
        targetName: "Boiler",
        mainAssetCount: 3,
      },
    ];
    render(
      <PmDayColumn
        annualEntries={annualEntries}
        canManage={false}
        date="2026-08-15"
        scopeQuery="organizationId=o&plantId=s"
        today="2026-08-20"
      />,
    );
    expect(
      screen.getByRole("link", { name: /Boiler/ }).getAttribute("href"),
    ).not.toContain("release=annual");
  });

  it("renders the mobile agenda as a separate labelled layout", () => {
    render(
      <PmAgendaList
        canManage
        month="2026-08-01"
        plans={[]}
        scopeQuery="organizationId=o&plantId=s"
      />,
    );
    expect(
      screen.getByRole("region", { name: "รายการแผน PM รายวัน" }).className,
    ).toContain("md:hidden");
  });
  it("offers explicit month and day views with the active state", () => {
    render(
      <PmCalendarViewSwitcher
        view="day"
        monthHref="/dashboardpm/calendar?view=month"
        dayHref="/dashboardpm/calendar?view=day"
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "รูปแบบปฏิทิน PM" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Day" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Month" }).getAttribute("href"),
    ).toContain("view=month");
  });
  it("renders one all-day column without inventing hourly PM times", () => {
    const plan = {
      id: "p",
      plannedDateKey: "2026-08-15",
      status: "CONFIRMED",
      number: "PMP-S01-20260815-001",
      draftGroups: [],
      groupSnapshots: [
        { id: "g", codeSnapshot: "PUMP", nameSnapshot: "Pump room" },
      ],
      _count: { works: 2 },
    };
    render(
      <PmDayColumn
        canManage
        date="2026-08-15"
        plan={plan}
        scopeQuery="organizationId=o&plantId=s"
        today="2026-08-20"
      />,
    );
    expect(
      screen.getByRole("region", { name: "ปฏิทิน PM รายวัน" }),
    ).toBeTruthy();
    expect(screen.getByText("ทั้งวัน")).toBeTruthy();
    expect(screen.getByText("ไม่ระบุเวลา", { exact: false })).toBeTruthy();
    expect(screen.getByText("PUMP · Pump room")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "วันถัดไป" }).getAttribute("href"),
    ).toContain("date=2026-08-16");
  });
});
