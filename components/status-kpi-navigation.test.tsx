import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusKpiNavigation } from "./status-kpi-navigation";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("StatusKpiNavigation", () => {
  it("navigates without a server round trip when the status has no unread updates", () => {
    const readAction = vi.fn();
    render(<StatusKpiNavigation ariaLabel="Backlog" className="" href="/work?status=BACKLOG_SHUTDOWN" readAction={readAction} status="BACKLOG_SHUTDOWN" unreadCount={0}>Backlog</StatusKpiNavigation>);

    expect(screen.getByRole("link", { name: "Backlog" }).getAttribute("href")).toBe("/work?status=BACKLOG_SHUTDOWN");
    expect(readAction).not.toHaveBeenCalled();
  });

  it("marks unread updates then preserves scroll while changing status", async () => {
    const readAction = vi.fn().mockResolvedValue(undefined);
    render(<StatusKpiNavigation ariaLabel="Waiting to close" className="" href="/work?status=WAITING_TO_CLOSE" readAction={readAction} status="WAITING_TO_CLOSE" unreadCount={2}>Waiting to close</StatusKpiNavigation>);

    fireEvent.click(screen.getByRole("link", { name: "Waiting to close" }));

    await waitFor(() => expect(readAction).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/work?status=WAITING_TO_CLOSE", { scroll: false }));
  });
});
