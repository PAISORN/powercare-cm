import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkStatus } from "../modules/cm-work/cm-work-types";
import { StatusKpiStrip } from "./status-kpi-strip";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("StatusKpiStrip", () => {
  it("shows exact unread counts on their status cards", () => {
    render(
      <StatusKpiStrip
        statusCountByKey={new Map([[WorkStatus.NEW, 10]])}
        unreadCountByStatus={{ [WorkStatus.NEW]: 4 }}
        getHref={() => "/work?status=NEW"}
        readAction={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("4 unread items")).toBeTruthy();
    const card = screen.getByRole("link", { name: `Status KPI ${WorkStatus.NEW}` });
    expect(card).toBeTruthy();
    expect(card.className).toContain("dashboard-kpi");
    expect(card.closest("section")?.className).toContain("dashboard-kpi-carousel");
  });
});
