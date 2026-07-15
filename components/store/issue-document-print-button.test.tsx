import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssueDocumentPrintButton } from "./issue-document-print-button";

describe("IssueDocumentPrintButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, "print").mockImplementation(() => undefined);
  });

  it("prints immediately when signatures are complete", () => {
    render(<IssueDocumentPrintButton />);
    fireEvent.click(screen.getByRole("button", { name: /พิมพ์/ }));
    expect(window.print).toHaveBeenCalledOnce();
  });

  it("warns but allows printing when a signature is missing", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<IssueDocumentPrintButton missingSignatures={["วิศวกรผู้อนุมัติ"]} />);
    fireEvent.click(screen.getByRole("button", { name: /พิมพ์/ }));
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(window.print).toHaveBeenCalledOnce();
  });
});
