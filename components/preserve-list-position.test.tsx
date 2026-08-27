import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreserveListPositionLink, RestoreListPosition } from "./preserve-list-position";

describe("preserve list position", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 1375 });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
  });

  it("stores the current scroll position when opening an editor", () => {
    const { getByRole } = render(
      <PreserveListPositionLink href="/work?page=4&editWorkId=w75" storageKey="work:/work?page=4" targetId="work-row-w75">
        Edit
      </PreserveListPositionLink>,
    );

    fireEvent.click(getByRole("link", { name: "Edit" }));

    expect(JSON.parse(window.sessionStorage.getItem("powercare:list-position:work:/work?page=4") ?? "null")).toMatchObject({
      scrollY: 1375,
      targetId: "work-row-w75",
    });
  });

  it("restores the exact position after the editor closes and consumes the saved state", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    window.sessionStorage.setItem("powercare:list-position:stock:page-4", JSON.stringify({
      scrollY: 1375,
      targetId: "stock-row-part-75",
      savedAt: Date.now(),
    }));

    render(<RestoreListPosition enabled storageKey="stock:page-4" />);

    expect(scrollTo).toHaveBeenCalledWith({ top: 1375, behavior: "auto" });
    expect(window.sessionStorage.getItem("powercare:list-position:stock:page-4")).toBeNull();
  });

  it("does not consume the position while the editor is open", () => {
    window.sessionStorage.setItem("powercare:list-position:stock:page-4", "saved");

    render(<RestoreListPosition enabled={false} storageKey="stock:page-4" />);

    expect(window.sessionStorage.getItem("powercare:list-position:stock:page-4")).toBe("saved");
  });
});
