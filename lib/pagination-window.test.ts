import { describe, expect, it } from "vitest";
import { paginationWindow } from "./pagination-window";

describe("paginationWindow", () => {
  it("shows no more than three page numbers", () => {
    expect(paginationWindow(1, 26)).toEqual([1, 2, 3]);
    expect(paginationWindow(4, 26)).toEqual([4, 5, 6]);
    expect(paginationWindow(26, 26)).toEqual([25, 26]);
  });

  it("shows only the available pages", () => {
    expect(paginationWindow(1, 2)).toEqual([1, 2]);
    expect(paginationWindow(1, 1)).toEqual([1]);
  });
});
