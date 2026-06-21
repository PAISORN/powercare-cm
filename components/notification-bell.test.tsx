import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotificationBell } from "./notification-bell";

const notification = {
  id: "notification-1",
  title: "CM-2026-06-0001 updated",
  message: "Work status changed",
  href: "/work/work-1",
  readAt: null,
  createdAt: new Date("2026-06-19T10:00:00.000Z"),
};

describe("NotificationBell", () => {
  it("caps the visible count at 99+ and hides zero", () => {
    const { rerender } = render(<NotificationBell unreadCount={120} notifications={[]} />);
    expect(screen.getByText("99+")).toBeTruthy();

    rerender(<NotificationBell unreadCount={0} notifications={[]} />);
    expect(screen.queryByText("99+")).toBeNull();
  });

  it("shows notification content when opened without submitting a read action", () => {
    render(<NotificationBell unreadCount={1} notifications={[notification]} />);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    expect(screen.getByText(notification.title)).toBeTruthy();
    expect(screen.getByText(notification.message)).toBeTruthy();
  });
});
