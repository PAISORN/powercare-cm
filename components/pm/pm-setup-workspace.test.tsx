import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PmSetupNavigation, PmSetupPanel, PmSetupWorkspace, PmSetupWorkspaceField } from "./pm-setup-workspace";

describe("PM Setup task workspace", () => {
  it("switches tasks without remounting unsaved fields and submits the current task", () => {
    render(<PmSetupWorkspace initialTask="pattern" hasPattern><PmSetupNavigation />
      <form data-testid="workspace-form"><PmSetupWorkspaceField />
        <PmSetupPanel task="pattern"><input aria-label="Unsaved target" defaultValue="ASH" /></PmSetupPanel>
        <PmSetupPanel task="calendar"><p>Calendar content</p></PmSetupPanel>
      </form></PmSetupWorkspace>);
    fireEvent.change(screen.getByLabelText("Unsaved target"), { target: { value: "STB" } });
    fireEvent.click(screen.getByRole("button", { name: "ปฏิทินและรายเดือน" }));
    expect(new FormData(screen.getByTestId("workspace-form") as HTMLFormElement).get("workspace")).toBe("calendar");
    fireEvent.click(screen.getByRole("button", { name: "Pattern ต้นแบบ" }));
    expect((screen.getByLabelText("Unsaved target") as HTMLInputElement).value).toBe("STB");
  });

  it("does not offer an unavailable Pattern task and supports keyboard navigation", () => {
    render(<PmSetupWorkspace initialTask="calendar" hasPattern={false}><PmSetupNavigation /></PmSetupWorkspace>);
    expect(screen.queryByRole("button", { name: "Pattern ต้นแบบ" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("button", { name: "ปฏิทินและรายเดือน" }), { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "ตั้งค่าแผน" }).getAttribute("aria-pressed")).toBe("true");
  });
});
