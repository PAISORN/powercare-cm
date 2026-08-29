import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExclusiveDetails } from "./exclusive-details";

describe("ExclusiveDetails", () => {
  it("keeps only the most recently opened menu expanded", () => {
    const { getByText } = render(
      <>
        <ExclusiveDetails>
          <summary>First menu</summary>
          <button>First edit</button>
        </ExclusiveDetails>
        <ExclusiveDetails>
          <summary>Second menu</summary>
          <button>Second edit</button>
        </ExclusiveDetails>
      </>,
    );

    const firstMenu = getByText("First menu").closest("details");
    const secondMenu = getByText("Second menu").closest("details");

    if (!firstMenu || !secondMenu) throw new Error("Expected both details elements");

    firstMenu.open = true;
    fireEvent(firstMenu, new Event("toggle"));
    expect(firstMenu.open).toBe(true);

    secondMenu.open = true;
    fireEvent(secondMenu, new Event("toggle"));
    expect(secondMenu.open).toBe(true);
    expect(firstMenu.open).toBe(false);
  });

  it("portals the menu outside overflow containers and opens upward near the viewport bottom", async () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 500 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.tagName === "SUMMARY") {
        return { bottom: 480, height: 20, left: 272, right: 300, top: 460, width: 28 } as DOMRect;
      }
      if (this.hasAttribute("data-exclusive-floating-menu")) {
        return { bottom: 0, height: 100, left: 0, right: 0, top: 0, width: 144 } as DOMRect;
      }
      return { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 } as DOMRect;
    });

    const { getByText } = render(
      <div className="overflow-hidden">
        <ExclusiveDetails>
          <summary>Row menu</summary>
          <div>Edit and delete</div>
        </ExclusiveDetails>
      </div>,
    );
    const details = getByText("Row menu").closest("details");
    if (!details) throw new Error("Expected details element");

    details.open = true;
    fireEvent(details, new Event("toggle"));

    await waitFor(() => {
      const floatingMenu = document.querySelector<HTMLElement>("[data-exclusive-floating-menu]");
      expect(floatingMenu?.parentElement).toBe(document.body);
      expect(floatingMenu?.style.top).toBe("352px");
      expect(floatingMenu?.style.visibility).toBe("visible");
    });
  });

  it("closes when the user clicks outside or presses another button", () => {
    const { getByText } = render(
      <>
        <ExclusiveDetails>
          <summary>Actions</summary>
          <div>Edit and delete</div>
        </ExclusiveDetails>
        <button>Another button</button>
      </>,
    );
    const details = getByText("Actions").closest("details");
    if (!details) throw new Error("Expected details element");

    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(details.open).toBe(true);

    fireEvent.pointerDown(getByText("Another button"));
    expect(details.open).toBe(false);
    expect(document.querySelector("[data-exclusive-floating-menu]")).toBeNull();
  });

  it("lets an action run before closing the floating menu", async () => {
    const onClick = vi.fn();
    const { getByText } = render(
      <ExclusiveDetails>
        <summary>Actions</summary>
        <a href="?editPartId=part-1" onClick={(event) => { event.preventDefault(); onClick(); }}>Edit</a>
      </ExclusiveDetails>,
    );
    const details = getByText("Actions").closest("details");
    if (!details) throw new Error("Expected details element");

    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(details.open).toBe(true);

    fireEvent.click(getByText("Edit"));
    expect(onClick).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(details.open).toBe(false);
      expect(document.querySelector("[data-exclusive-floating-menu]")).toBeNull();
    });
  });

  it("opens the floating menu when its summary is clicked", async () => {
    const { getByText } = render(
      <ExclusiveDetails>
        <summary>Stock row actions</summary>
        <a href="?editPartId=part-1">Edit stock</a>
      </ExclusiveDetails>,
    );

    fireEvent.click(getByText("Stock row actions"));

    await waitFor(() => {
      expect(getByText("Stock row actions").closest("details")?.open).toBe(true);
      expect(document.querySelector("[data-exclusive-floating-menu]")).not.toBeNull();
    });
  });
});
