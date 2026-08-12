import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavigationExperience } from "./navigation-experience";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("NavigationExperience", () => {
  beforeEach(() => {
    push.mockClear();
    window.history.replaceState({}, "", "/assets?tab=identity");
  });

  it("preserves scroll for query-driven navigation on the current page", () => {
    const { getByRole } = render(
      <>
        <NavigationExperience />
        <a href="/assets?tab=maintenance">Maintenance</a>
      </>,
    );

    fireEvent.click(getByRole("link", { name: "Maintenance" }));

    expect(push).toHaveBeenCalledWith("/assets?tab=maintenance", { scroll: false });
  });

  it("leaves navigation to another page to Next.js", () => {
    const { getByRole } = render(
      <>
        <NavigationExperience />
        <a href="/work">Work</a>
      </>,
    );

    fireEvent.click(getByRole("link", { name: "Work" }));

    expect(push).not.toHaveBeenCalled();
  });

  it("does not override links that intentionally target an anchor", () => {
    const { getByRole } = render(
      <>
        <NavigationExperience />
        <a href="/assets?tab=identity#documents">Documents</a>
      </>,
    );

    fireEvent.click(getByRole("link", { name: "Documents" }));

    expect(push).not.toHaveBeenCalled();
  });

  it("uses client navigation and preserves scroll for GET filters on the current page", () => {
    const { getByRole } = render(
      <>
        <NavigationExperience />
        <form action="/assets" method="get">
          <input name="search" defaultValue="pump" />
          <button type="submit">Filter</button>
        </form>
      </>,
    );

    fireEvent.click(getByRole("button", { name: "Filter" }));

    expect(push).toHaveBeenCalledWith("/assets?search=pump", { scroll: false });
  });

  it("does not intercept POST forms or download-oriented native GET forms", () => {
    const { getByRole } = render(
      <>
        <NavigationExperience />
        <form action="/assets/export" method="get" data-native-navigation="true">
          <button type="submit">Export</button>
        </form>
        <form action="/assets" method="post">
          <button type="submit">Save</button>
        </form>
      </>,
    );

    fireEvent.click(getByRole("button", { name: "Export" }));
    fireEvent.click(getByRole("button", { name: "Save" }));

    expect(push).not.toHaveBeenCalled();
  });
});
