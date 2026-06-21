import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfilePasswordForm } from "./profile-password-form";

describe("ProfilePasswordForm", () => {
  it("rejects mismatched confirmation before submit", () => {
    const action = vi.fn(async () => undefined);
    render(<ProfilePasswordForm action={action} />);

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "StrongPass123" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "Different123" } });
    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(screen.getByRole("alert").textContent).toContain("Passwords do not match");
  });
});
