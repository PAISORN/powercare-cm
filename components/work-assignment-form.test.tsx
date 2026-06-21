import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkAssignmentForm } from "./work-assignment-form";

describe("WorkAssignmentForm", () => {
  it("lists eligible technicians and submits the selected id", () => {
    render(
      <WorkAssignmentForm
        action={vi.fn()}
        technicians={[{ id: "tech-1", fullName: "Electrical Technician" }]}
      />,
    );
    expect((screen.getByRole("combobox", { name: "Technician" }) as HTMLSelectElement).value).toBe("");
    expect(screen.getByRole("option", { name: "Electrical Technician" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Assign work" })).toBeTruthy();
  });

  it("shows an unavailable message when no technician is eligible", () => {
    render(<WorkAssignmentForm action={vi.fn()} technicians={[]} />);
    expect(screen.getByText("No active technician is available in this category")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Assign work" })).toBeNull();
  });
});
