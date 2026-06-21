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
});
