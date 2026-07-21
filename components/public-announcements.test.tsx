import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicAnnouncements } from "./public-announcements";

const base = {
  content: "Announcement content",
  publishStart: new Date("2026-06-18T00:00:00Z"),
  publishEnd: new Date("2026-06-20T00:00:00Z"),
  imageStoragePath: null,
  authorName: "System Admin",
};

describe("PublicAnnouncements", () => {
  it("renders pinned announcements before regular announcements", () => {
    render(
      <PublicAnnouncements
        announcements={[
          { ...base, id: "regular", title: "Regular notice", pinned: false, isNew: false },
          { ...base, id: "pinned", title: "Pinned notice", pinned: true, isNew: false },
        ]}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 3 }).map((item) => item.textContent);
    expect(headings).toEqual(["Pinned notice", "Regular notice"]);
  });

  it("shows a NEW badge for announcements in their first three days", () => {
    render(
      <PublicAnnouncements
        announcements={[{ ...base, id: "new", title: "New notice", pinned: false, isNew: true }]}
      />,
    );
    expect(screen.getByText("NEW")).toBeTruthy();
  });

  it("shows the platform announcement author and publish window", () => {
    render(
      <PublicAnnouncements
        announcements={[{ ...base, id: "notice", title: "Site notice", pinned: false, isNew: false }]}
      />,
    );

    expect(screen.getByText(/System Admin/)).toBeTruthy();
    expect(screen.queryByText("Site Communication")).toBeNull();
  });
});
