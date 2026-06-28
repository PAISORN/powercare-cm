import { describe, expect, it } from "vitest";
import React from "react";
import { RoleName } from "../modules/cm-work/cm-work-types";
import { getAppLinks } from "./app-nav-links";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppNavLinks } from "./app-nav-links";

describe("getAppLinks", () => {
  it.each([RoleName.ADMIN, RoleName.ENGINEER, RoleName.TECHNICIAN])("shows Members to %s", (role) => {
    expect(getAppLinks(role).some((link) => link.href === "/members")).toBe(true);
  });

  it.each([RoleName.ADMIN, RoleName.ENGINEER, RoleName.TECHNICIAN])("shows Notifications to %s", (role) => {
    expect(getAppLinks(role).some((link) => link.href === "/notifications")).toBe(true);
  });

  it("shows System Settings only to admin", () => {
    expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/settings")).toBe(true);
    expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/settings")).toBe(false);
    expect(getAppLinks(RoleName.TECHNICIAN).some((link) => link.href === "/admin/settings")).toBe(false);
  });

  it("shows LINE Settings only to admin", () => {
    expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/line")).toBe(true);
    expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/line")).toBe(false);
    expect(getAppLinks(RoleName.TECHNICIAN).some((link) => link.href === "/admin/line")).toBe(false);
  });

  it("shows Organization only to admin", () => {
    expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/organization")).toBe(true);
    expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/organization")).toBe(false);
    expect(getAppLinks(RoleName.TECHNICIAN).some((link) => link.href === "/admin/organization")).toBe(false);
  });

  it("groups admin setup pages under Admin Settings", () => {
    const links = getAppLinks(RoleName.ADMIN);

    expect(links.some((link) => link.kind === "section" && link.label === "Admin Settings")).toBe(true);
    for (const href of ["/admin/settings", "/admin/organization", "/admin/announcements", "/admin/line", "/admin/categories", "/admin/zones", "/admin/qr-code"]) {
      expect(links.some((link) => link.href === href && link.nested)).toBe(true);
    }
  });

  it("groups report pages under Reports", () => {
    const links = getAppLinks(RoleName.ENGINEER);

    expect(links.some((link) => link.kind === "section" && link.label === "Reports")).toBe(true);
    expect(links.some((link) => link.href === "/reports/daily" && link.nested)).toBe(true);
    expect(links.some((link) => link.href === "/reports/cm" && link.nested)).toBe(true);
  });

  it("hides admin setting links until the Admin Settings trigger is clicked", () => {
    render(React.createElement(AppNavLinks, { role: RoleName.ADMIN }));

    expect(screen.queryByRole("link", { name: /System Settings/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Admin Settings/i }));

    expect(screen.getByRole("link", { name: /System Settings/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Organization/i })).toBeTruthy();
  });

  it("hides report links until the Reports trigger is clicked", () => {
    render(React.createElement(AppNavLinks, { role: RoleName.ENGINEER }));

    expect(screen.queryByRole("link", { name: /Daily Report/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Reports/i }));

    expect(screen.getByRole("link", { name: /Daily Report/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /CM Reports/i })).toBeTruthy();
  });
});
