import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CmDateFilterBar } from "./cm-date-filter-bar";

describe("CmDateFilterBar options", () => {
  it("does not render the terminal-work checkbox", () => {
    render(<CmDateFilterBar />);

    expect(screen.queryByRole("checkbox", { name: "รวมงานปิดแล้ว / ยกเลิก" })).toBeNull();
  });
});
