import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicHeader } from "./public-header";

describe("PublicHeader", () => {
  it("does not show an application menu on public pages", () => {
    render(<PublicHeader />);

    expect(screen.queryByRole("button", { name: "Open menu" })).toBeNull();
    expect(screen.getByRole("link", { name: "Staff Login" })).not.toBeNull();
  });
});
