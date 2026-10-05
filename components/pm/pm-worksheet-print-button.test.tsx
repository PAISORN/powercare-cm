import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PmWorksheetPrintButton } from "./pm-worksheet-print-button";

describe("PmWorksheetPrintButton", () => {
  afterEach(() => {
    document.body.classList.remove("pm-worksheet-printing");
    vi.restoreAllMocks();
  });

  it("enters worksheet print mode and opens the browser print dialog", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PmWorksheetPrintButton />);

    fireEvent.click(screen.getByRole("button", { name: "พิมพ์ / บันทึก PDF" }));

    expect(document.body.classList.contains("pm-worksheet-printing")).toBe(
      true,
    );
    expect(print).toHaveBeenCalledOnce();

    window.dispatchEvent(new Event("afterprint"));
    expect(document.body.classList.contains("pm-worksheet-printing")).toBe(
      false,
    );
  });

  it("is grey and cannot print before the PM work is completed", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PmWorksheetPrintButton autoPrint disabled />);

    const button = screen.getByRole("button", { name: "พิมพ์ / บันทึก PDF" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass(
      "disabled:bg-slate-100",
      "disabled:text-slate-400",
    );
    fireEvent.click(button);
    expect(print).not.toHaveBeenCalled();
  });
});
