import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrintButton } from "./print-button";

describe("PrintButton", () => {
  it("opens the browser print dialog", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintButton />);

    fireEvent.click(screen.getByRole("button", { name: "Print / Save PDF" }));

    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });

  it("supports a custom localized label", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintButton label="พิมพ์ / บันทึก PDF" />);

    fireEvent.click(screen.getByRole("button", { name: "พิมพ์ / บันทึก PDF" }));

    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});
