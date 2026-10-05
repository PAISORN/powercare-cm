import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PmWorkAssignmentForm } from "./pm-work-assignment-form";
import { PmWorkResultForm } from "./pm-work-result-form";
import { PmWorksheetFooter } from "./pm-worksheet-footer";
import { PmWorksheetSummaryForm } from "./pm-worksheet-summary-form";

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
  it("associates the worksheet summary with the completion server-action form", () => {
    render(<><PmWorksheetSummaryForm completionFormId="worksheet-complete" /><PmWorksheetFooter backHref="/back" completeAction={vi.fn()} completionFormId="worksheet-complete" /></>);
    const normal = screen.getByRole("radio", { name: "เสร็จสิ้น (ปกติ)" }) as HTMLInputElement;
    const note = screen.getByRole("textbox", { name: /หมายเหตุเพิ่มเติม/ }) as HTMLTextAreaElement;
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getAllByRole("radio").every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(normal).toBeRequired();
    expect(normal.form?.id).toBe("worksheet-complete");
    expect(note.form?.id).toBe("worksheet-complete");
    expect(screen.getByRole("button", { name: "ส่งใบงาน / เสร็จสิ้น" })).toHaveAttribute("type", "submit");
  });
  it("captures every checklist value before submitting the worksheet", () => {
    render(<><form data-pm-checklist-form><input defaultValue="OK" name="result_asset_field" /><textarea defaultValue="เสียงดังเล็กน้อย" name="other_asset_field" /></form><PmWorksheetSummaryForm completionFormId="worksheet-capture" /><PmWorksheetFooter backHref="/back" completeAction={vi.fn()} completionFormId="worksheet-capture" /></>);
    fireEvent.submit(document.getElementById("worksheet-capture")!);
    expect((document.querySelector('input[name="worksheetDataJson"]') as HTMLInputElement).value).toBe('{"result_asset_field":"OK","other_asset_field":"เสียงดังเล็กน้อย"}');
  });
  it("locks a completed worksheet until the edit action is chosen", () => {
    render(<><PmWorksheetSummaryForm completionFormId="worksheet-readonly" defaultNote="ตรวจแล้ว" defaultResult="ABNORMAL" readOnly /><PmWorksheetFooter backHref="/back" completed completionFormId="worksheet-readonly" editHref="/worksheet?edit=1" /></>);
    expect(screen.getByRole("radio", { name: "เสร็จสิ้น (พบปัญหา / แจ้งซ่อม)" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /หมายเหตุเพิ่มเติม/ })).toBeDisabled();
    expect(screen.getByRole("link", { name: "แก้ไขใบงาน" })).toHaveAttribute("href", "/worksheet?edit=1");
    expect(screen.queryByRole("button", { name: "ส่งใบงาน / เสร็จสิ้น" })).not.toBeInTheDocument();
  });
});
