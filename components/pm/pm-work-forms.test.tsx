import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PmWorkAssignmentForm } from "./pm-work-assignment-form";
import { PmWorkResultForm } from "./pm-work-result-form";

const users = [{ id: "u1", fullName: "Lead One", role: "TECHNICIAN" }, { id: "u2", fullName: "Helper Two", role: "ENGINEER" }];
describe("PM work forms", () => {
  it("offers one lead and multiple collaborators with accessible controls", () => {
    render(<PmWorkAssignmentForm action={vi.fn()} users={users} />);
    expect(screen.getByRole("combobox", { name: "Lead performer" })).toBeRequired();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Save assignment" })).toBeInTheDocument();
  });
  it("requires a note only when Abnormal is selected", () => {
    render(<PmWorkResultForm action={vi.fn()} />);
    const note = screen.getByRole("textbox", { name: "Result note" }); expect(note).not.toBeRequired();
    fireEvent.change(screen.getByRole("combobox", { name: "PM result" }), { target: { value: "ABNORMAL" } });
    expect(note).toBeRequired(); expect(screen.getByText(/required for an abnormal/i)).toBeInTheDocument();
  });
  it("requires a correction reason in correction mode", () => {
    render(<PmWorkResultForm action={vi.fn()} correction defaultResult="ABNORMAL" defaultNote="noise" />);
    expect(screen.getByRole("textbox", { name: "Correction reason" })).toBeRequired();
  });
});
