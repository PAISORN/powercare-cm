import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PermissionToggle } from "./permission-toggle";

describe("PermissionToggle", () => {
  it("supports INHERIT, ALLOW, and DENY while exposing the effective result", () => {
    const { container } = render(
      <PermissionToggle
        description="receive_stock"
        inheritedAllowed
        initialDecision="INHERIT"
        name="permission:receive_stock"
        title="Receive Stock"
      />,
    );

    expect(screen.getByText("มีผลจริง: Allow")).toBeTruthy();
    expect(container.querySelector<HTMLInputElement>('input[name="permission:receive_stock"]')?.value).toBe("INHERIT");
    expect(container.querySelector('input[name="changedPermissionKeys"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(screen.getByText("มีผลจริง: Deny")).toBeTruthy();
    expect(container.querySelector<HTMLInputElement>('input[name="permission:receive_stock"]')?.value).toBe("DENY");
    expect(container.querySelector<HTMLInputElement>('input[name="changedPermissionKeys"]')?.value).toBe("receive_stock");

    fireEvent.click(screen.getByRole("button", { name: "ตาม Role" }));
    expect(container.querySelector('input[name="changedPermissionKeys"]')).toBeNull();
  });

  it("can replace an explicit override with INHERIT", () => {
    const { container } = render(
      <PermissionToggle
        description="receive_stock"
        inheritedAllowed={false}
        initialDecision="ALLOW"
        name="permission:receive_stock"
        title="Receive Stock"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ตาม Role" }));
    expect(screen.getByText("มีผลจริง: Deny")).toBeTruthy();
    expect(container.querySelector<HTMLInputElement>('input[name="permission:receive_stock"]')?.value).toBe("INHERIT");
    expect(container.querySelector<HTMLInputElement>('input[name="changedPermissionKeys"]')?.value).toBe("receive_stock");
  });
});
