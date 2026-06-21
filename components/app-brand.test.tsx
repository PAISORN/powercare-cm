import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";
import { AppBrand, APP_VERSION } from "./app-brand";

describe("AppBrand", () => {
  it("shows PowerCare.CM with the package version", () => {
    render(<AppBrand />);

    expect(screen.getByText("PowerCare.CM")).toBeTruthy();
    expect(screen.getByText("v1.1.0")).toBeTruthy();
    expect(APP_VERSION).toBe(`v${packageJson.version}`);
  });
});
