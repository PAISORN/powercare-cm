import { describe, expect, it, vi } from "vitest";
import { syncStockHeaderColumnWidths } from "./stock-header-replacement-controller";

describe("syncStockHeaderColumnWidths", () => {
  it("copies the rendered source widths to the fixed replacement columns", () => {
    const source = document.createElement("thead");
    const replacement = document.createElement("div");
    source.innerHTML = "<tr><th>A</th><th>B</th><th>C</th></tr>";
    replacement.innerHTML = "<table><colgroup><col><col><col></colgroup></table>";
    const widths = [84, 212.5, 136];
    Array.from(source.querySelectorAll("th")).forEach((cell, index) => {
      vi.spyOn(cell, "getBoundingClientRect").mockReturnValue({ width: widths[index] } as DOMRect);
    });

    syncStockHeaderColumnWidths(source, replacement);

    expect(Array.from(replacement.querySelectorAll("col")).map((column) => column.style.width)).toEqual([
      "84px",
      "212.5px",
      "136px",
    ]);
  });

  it("does not partially update a mismatched replacement header", () => {
    const source = document.createElement("thead");
    const replacement = document.createElement("div");
    source.innerHTML = "<tr><th>A</th><th>B</th></tr>";
    replacement.innerHTML = "<table><colgroup><col></colgroup></table>";

    syncStockHeaderColumnWidths(source, replacement);

    expect(replacement.querySelector("col")?.style.width).toBe("");
  });
});
