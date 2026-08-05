import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnreadBadge } from "./unread-badge";

describe("UnreadBadge", () => {
  it("hides zero and caps counts above 99", () => {
    const { rerender } = render(<UnreadBadge count={0} />);
    expect(screen.queryByLabelText(/unread/i)).toBeNull();

    rerender(<UnreadBadge count={125} />);
    expect(screen.getByText("99+")).toBeTruthy();
    expect(screen.getByLabelText("125 unread items")).toBeTruthy();
  });

  it("keeps the counter inside clipping card containers", () => {
    render(<UnreadBadge count={5} />);

    const badge = screen.getByLabelText("5 unread items");
    expect(badge.className).toContain("right-2");
    expect(badge.className).toContain("top-2");
    expect(badge.className).not.toContain("-right-2");
    expect(badge.className).not.toContain("-top-2");
  });

  it("supports a compact inset for icon buttons without conflicting position classes", () => {
    render(<UnreadBadge count={3} position="icon" />);

    const badge = screen.getByLabelText("3 unread items");
    expect(badge.className).toContain("right-0");
    expect(badge.className).toContain("top-0");
    expect(badge.className).not.toContain("right-2");
    expect(badge.className).not.toContain("top-2");
  });
});
