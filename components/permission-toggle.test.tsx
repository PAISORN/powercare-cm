import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PermissionToggle } from "./permission-toggle";

describe("PermissionToggle", () => {
  it("stores Allow when on and Deny when off", () => {
    const { container } = render(
      <PermissionToggle
        defaultAllowed
        description="receive_stock"
        name="permission:receive_stock"
        title="Receive Stock"
      />,
    );
    const toggle = screen.getByRole("switch", { name: "Receive Stock: Allow" });
    const input = container.querySelector<HTMLInputElement>('input[name="permission:receive_stock"]');

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(input?.value).toBe("ALLOW");

    fireEvent.click(toggle);

    expect(screen.getByRole("switch", { name: "Receive Stock: Deny" }).getAttribute("aria-checked")).toBe("false");
    expect(input?.value).toBe("DENY");
  });
});
