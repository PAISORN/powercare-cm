import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PmWorksheetSuccessDialog } from "./pm-worksheet-success-dialog";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("PmWorksheetSuccessDialog", () => {
  beforeEach(() => mocks.push.mockClear());

  it("celebrates successful completion and returns to PM Main Assets after OK", () => {
    render(<PmWorksheetSuccessDialog backHref="/dashboardpm/annual/schedule" />);
    expect(screen.getByRole("dialog", { name: "ส่งใบงานเรียบร้อยแล้ว" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-pm-confetti]").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /OK.*PM Main Assets/ }));
    expect(mocks.push).toHaveBeenCalledWith("/dashboardpm/annual/schedule");
  });

  it("uses the revised-work confirmation copy after saving an edit", () => {
    render(<PmWorksheetSuccessDialog backHref="/dashboardpm/annual/schedule" updated />);
    expect(screen.getByRole("dialog", { name: "บันทึกการแก้ไขแล้ว" })).toBeInTheDocument();
  });
});
