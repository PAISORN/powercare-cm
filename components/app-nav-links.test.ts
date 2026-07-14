import { describe, expect, it } from "vitest";
import React from "react";
import { RoleName } from "../modules/cm-work/cm-work-types";
import { getAppLinks } from "./app-nav-links";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppNavLinks } from "./app-nav-links";
import { PermissionKey, type SiteAdminPermissionRecord } from "../modules/auth/site-admin-permissions";

const plantAdminContext = (...permissionKeys: string[]) => ({
  id: "plant-admin-1",
  plantId: "plant-1",
  siteAdminPermissions: permissionKeys.map(
    (permissionKey): SiteAdminPermissionRecord => ({
      userId: "plant-admin-1",
      plantId: "plant-1",
      permissionKey,
      enabled: true,
    }),
  ),
});

describe("getAppLinks", () => {
  it.each([RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN, RoleName.SITE_ADMIN, RoleName.ENGINEER, RoleName.TECHNICIAN, RoleName.VISITOR])("shows Members to %s", (role) => {
    expect(getAppLinks(role).some((link) => link.href === "/members")).toBe(true);
  });

  it.each([RoleName.ADMIN, RoleName.ORGANIZATION_ADMIN, RoleName.SITE_ADMIN, RoleName.ENGINEER, RoleName.TECHNICIAN])("shows Notifications to %s", (role) => {
    expect(getAppLinks(role).some((link) => link.href === "/notifications")).toBe(true);
  });

  it("shows System Settings to admin and Site Admin for engineer assignment mode", () => {
    expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/settings")).toBe(true);
    expect(getAppLinks(RoleName.SITE_ADMIN).some((link) => link.href === "/admin/settings")).toBe(false);
    expect(getAppLinks(RoleName.SITE_ADMIN, plantAdminContext(PermissionKey.MANAGE_ENGINEER_ASSIGNMENT)).some((link) => link.href === "/admin/settings")).toBe(true);
    expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/settings")).toBe(false);
    expect(getAppLinks(RoleName.TECHNICIAN).some((link) => link.href === "/admin/settings")).toBe(false);
  });

  it("shows Admin Settings tools to admins and permitted Site Admins", () => {
    expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/line")).toBe(true);
    expect(getAppLinks(RoleName.SITE_ADMIN).some((link) => link.href === "/admin/line")).toBe(false);
    expect(getAppLinks(RoleName.SITE_ADMIN, plantAdminContext(PermissionKey.MANAGE_LINE_SETTINGS)).some((link) => link.href === "/admin/line")).toBe(true);
    expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/line")).toBe(false);
    expect(getAppLinks(RoleName.TECHNICIAN).some((link) => link.href === "/admin/line")).toBe(false);
  });

  it("shows Organization to admins and Site Admins", () => {
    expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/organization")).toBe(true);
    expect(getAppLinks(RoleName.SITE_ADMIN).some((link) => link.href === "/admin/organization")).toBe(true);
    expect(getAppLinks(RoleName.SITE_ADMIN, plantAdminContext(PermissionKey.MANAGE_PLANT_PROFILE)).some((link) => link.href === "/admin/organization")).toBe(true);
    expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/organization")).toBe(false);
    expect(getAppLinks(RoleName.TECHNICIAN).some((link) => link.href === "/admin/organization")).toBe(false);
  });

  it("shows Admin Users to owner admins and Site Admins", () => {
    expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/users")).toBe(true);
    expect(getAppLinks(RoleName.ORGANIZATION_ADMIN).some((link) => link.href === "/admin/users")).toBe(true);
    expect(getAppLinks(RoleName.SITE_ADMIN).some((link) => link.href === "/admin/users")).toBe(false);
    expect(getAppLinks(RoleName.SITE_ADMIN, plantAdminContext(PermissionKey.MANAGE_USERS_PLANT)).some((link) => link.href === "/admin/users")).toBe(true);
    expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/users")).toBe(false);
  });

  it("places Admin Users inside the Administration submenu", () => {
    const links = getAppLinks(RoleName.ADMIN);
    const adminUsersLink = links.find((link) => link.href === "/admin/users");

    expect(adminUsersLink).toMatchObject({
      nested: true,
      parentSectionId: "administration",
    });
  });

  it("groups platform setup pages under the new sidebar sections", () => {
    const links = getAppLinks(RoleName.ADMIN);

    expect(links.some((link) => link.kind === "section" && link.label === "Organization")).toBe(true);
    expect(links.some((link) => link.kind === "section" && link.label === "Master Data")).toBe(true);
    expect(links.some((link) => link.kind === "section" && link.label === "Communication")).toBe(true);
    expect(links.some((link) => link.kind === "section" && link.label === "Administration")).toBe(true);
    expect(links.some((link) => link.label === "Site Admin Permissions" && link.href === "/admin/site-admin-permissions" && link.parentSectionId === "organization")).toBe(true);
    expect(links.some((link) => link.label === "Plant Admin Permissions")).toBe(false);
    for (const href of ["/admin/settings", "/admin/line", "/admin/history", "/admin/users"]) {
      expect(links.some((link) => link.href === href && link.nested && link.parentSectionId === "administration")).toBe(true);
    }
    for (const href of ["/admin/categories", "/admin/zones", "/admin/qr-code", "/admin/sla"]) {
      expect(links.some((link) => link.href === href && link.nested && link.parentSectionId === "master-data")).toBe(true);
    }
    for (const href of ["/admin/organization", "/admin/sites", "/admin/site-admin-permissions"]) {
      expect(links.some((link) => link.href === href && link.nested && link.parentSectionId === "organization")).toBe(true);
    }
    for (const href of ["/admin/announcements", "/admin/feedback"]) {
      expect(links.some((link) => link.href === href && link.nested)).toBe(true);
    }
  });

  it("shows organization admin tools without platform-only announcement and feedback tools", () => {
    const links = getAppLinks(RoleName.ORGANIZATION_ADMIN);

    expect(links.some((link) => link.kind === "section" && link.label === "Administration")).toBe(true);
    expect(links.some((link) => link.kind === "section" && link.label === "Organization")).toBe(true);
    expect(links.some((link) => link.href === "/admin/users")).toBe(true);
    expect(links.some((link) => link.href === "/admin/sites")).toBe(true);
    expect(links.some((link) => link.href === "/admin/site-admin-permissions")).toBe(false);
    expect(links.some((link) => link.href === "/admin/announcements")).toBe(false);
    expect(links.some((link) => link.href === "/admin/feedback")).toBe(false);
  });

  it("shows SLA Settings to admins and Site Admins with SLA permission", () => {
    expect(getAppLinks(RoleName.ADMIN).some((link) => link.href === "/admin/sla")).toBe(true);
    expect(getAppLinks(RoleName.SITE_ADMIN).some((link) => link.href === "/admin/sla")).toBe(false);
    expect(getAppLinks(RoleName.SITE_ADMIN, plantAdminContext(PermissionKey.MANAGE_SLA_DUE_DATE)).some((link) => link.href === "/admin/sla")).toBe(true);
    expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/admin/sla")).toBe(false);
  });

  it("shows Site Admin tools without super admin announcement and feedback tools", () => {
    const links = getAppLinks(RoleName.SITE_ADMIN, plantAdminContext(PermissionKey.MANAGE_USERS_PLANT, PermissionKey.MANAGE_PLANT_PROFILE));

    expect(links.some((link) => link.kind === "section" && link.label === "Administration")).toBe(true);
    expect(links.some((link) => link.kind === "section" && link.label === "Organization")).toBe(true);
    expect(links.some((link) => link.href === "/admin/settings")).toBe(false);
    expect(links.some((link) => link.href === "/admin/site-admin-permissions")).toBe(false);
    expect(links.some((link) => link.href === "/admin/sites")).toBe(false);
    expect(links.some((link) => link.href === "/admin/announcements")).toBe(false);
    expect(links.some((link) => link.href === "/admin/feedback")).toBe(false);
    expect(links.some((link) => link.href === "/admin/users")).toBe(true);
    expect(links.some((link) => link.href === "/admin/organization" && link.nested && link.parentSectionId === "organization")).toBe(true);
  });

  it("shows one Report link under Maintenance instead of separate daily and CM report pages", () => {
    const links = getAppLinks(RoleName.ENGINEER);

    expect(links.some((link) => link.kind === "section" && link.label === "Maintenance")).toBe(true);
    expect(links.some((link) => link.label === "Report" && link.href === "/reports" && link.nested && link.parentSectionId === "maintenance")).toBe(true);
    expect(links.some((link) => link.kind === "section" && link.label === "Reports")).toBe(false);
    expect(links.some((link) => link.href === "/reports/daily")).toBe(false);
    expect(links.some((link) => link.href === "/reports/cm")).toBe(false);
  });

  it("keeps Assets placeholders disabled while Inventory links follow Store permissions", () => {
    const links = getAppLinks(RoleName.ADMIN);
    const visitorLinks = getAppLinks(RoleName.VISITOR);

    expect(links.some((link) => link.kind === "section" && link.label === "Assets")).toBe(true);
    expect(links.some((link) => link.kind === "section" && link.label === "Inventory")).toBe(true);
    expect(links.some((link) => link.label === "Equipment" && link.disabled)).toBe(true);
    expect(links.some((link) => link.label === "Spare Parts" && link.href === "/inventory/spare-parts" && !link.disabled)).toBe(true);
    expect(visitorLinks.some((link) => link.label === "Spare Parts" && link.disabled)).toBe(true);
  });

  it("shows real Inventory links to Store Officer", () => {
    const links = getAppLinks(RoleName.STORE_OFFICER);

    expect(links.some((link) => link.href === "/inventory/spare-parts" && !link.disabled)).toBe(true);
    expect(links.some((link) => link.href === "/inventory/stock" && !link.disabled)).toBe(true);
    expect(links.some((link) => link.href === "/inventory/issue" && !link.disabled)).toBe(true);
    expect(links.some((link) => link.href === "/inventory/receive" && !link.disabled)).toBe(true);
    expect(links.some((link) => link.href === "/inventory/tracking" && !link.disabled)).toBe(true);
    expect(links.some((link) => link.href === "/inventory/movements" && !link.disabled)).toBe(true);
    expect(links.some((link) => link.href === "/inventory/reports" && !link.disabled)).toBe(true);
    expect(links.some((link) => link.href === "/dashboard")).toBe(false);
    expect(links.some((link) => link.href === "/work")).toBe(false);
    expect(links.some((link) => link.href === "/admin/users")).toBe(false);
  });

  it("opens the Assets section without turning future items into links", () => {
    render(React.createElement(AppNavLinks, { role: RoleName.ADMIN }));

    expect(screen.queryByText("Equipment")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^Assets$/i }));

    expect(screen.getAllByText("Assets").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Equipment")).toBeTruthy();
    expect(screen.getByText("Preventive Maintenance")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Equipment/i })).toBeNull();
    expect(screen.getAllByText("Soon").length).toBeGreaterThanOrEqual(4);
  });

  it("can render the sidebar as icon-only collapsed navigation", () => {
    render(React.createElement(AppNavLinks, { role: RoleName.ADMIN, collapsed: true }));

    expect(screen.getByRole("link", { name: /^Dashboard$/i })).toBeTruthy();
    expect(screen.queryByText("Dashboard")).toBeNull();
    expect(screen.getByRole("button", { name: /^Maintenance$/i })).toBeTruthy();
  });

  it("shows My Activities to logged-in working roles", () => {
    const adminLinks = getAppLinks(RoleName.ADMIN);
    const adminActivitiesLink = adminLinks.find((link) => link.href === "/activities");
    expect(adminActivitiesLink).toBeTruthy();
    expect(adminActivitiesLink?.nested).toBeUndefined();
    expect(adminLinks.findIndex((link) => link.href === "/activities")).toBeGreaterThan(
      adminLinks.findIndex((link) => link.href === "/dashboard"),
    );
    expect(getAppLinks(RoleName.ORGANIZATION_ADMIN).some((link) => link.href === "/activities")).toBe(true);
    expect(getAppLinks(RoleName.SITE_ADMIN).some((link) => link.href === "/activities")).toBe(true);
    expect(getAppLinks(RoleName.ENGINEER).some((link) => link.href === "/activities")).toBe(true);
    expect(getAppLinks(RoleName.TECHNICIAN).some((link) => link.href === "/activities")).toBe(true);
    expect(getAppLinks(RoleName.STORE_OFFICER).some((link) => link.href === "/activities")).toBe(true);
    expect(getAppLinks(RoleName.VISITOR).some((link) => link.href === "/activities")).toBe(false);
  });

  it("hides administration links until the Administration trigger is clicked", () => {
    render(React.createElement(AppNavLinks, { role: RoleName.ADMIN }));

    expect(screen.queryByRole("link", { name: /System Settings/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Administration/i }));

    expect(screen.getByRole("link", { name: /System Settings/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Admin Users/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /LINE Settings/i })).toBeTruthy();
  });

  it("renders submenu links as indented bullet items without submenu icons", () => {
    render(React.createElement(AppNavLinks, { role: RoleName.ADMIN }));

    fireEvent.click(screen.getByRole("button", { name: /^Maintenance$/i }));

    const allWorkLink = screen.getByRole("link", { name: /All Work/i });

    expect(allWorkLink.className).toContain("ml-6");
    expect(allWorkLink.querySelector("[data-nav-submenu-bullet='true']")).toBeTruthy();
    expect(allWorkLink.querySelector("svg")).toBeNull();
  });

  it("hides organization links until the Organization trigger is clicked", () => {
    render(React.createElement(AppNavLinks, { role: RoleName.ADMIN }));

    expect(screen.queryByRole("link", { name: /Members/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^Organization$/i }));

    expect(screen.getByRole("link", { name: /^Organizations$/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Organization Structure/i })).toBeNull();
    expect(screen.getByRole("link", { name: /Sites/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Members/i })).toBeTruthy();
  });

  it("hides communication links until the Communication trigger is clicked", () => {
    render(React.createElement(AppNavLinks, { role: RoleName.ADMIN }));

    expect(screen.queryByRole("link", { name: /Feedback/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Communication/i }));

    expect(screen.getByRole("link", { name: /Announcements/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Feedback/i })).toBeTruthy();
  });

  it("hides the Report link until the Maintenance trigger is clicked", () => {
    render(React.createElement(AppNavLinks, { role: RoleName.ENGINEER }));

    expect(screen.queryByRole("link", { name: /^Report$/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Maintenance/i }));

    expect(screen.getByRole("link", { name: /^Report$/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Daily Report/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /CM Reports/i })).toBeNull();
  });

  it("keeps Visitor role read-only in the sidebar", () => {
    const links = getAppLinks(RoleName.VISITOR);

    expect(links.some((link) => link.href === "/dashboard")).toBe(true);
    expect(links.some((link) => link.href === "/work")).toBe(true);
    expect(links.some((link) => link.href === "/members")).toBe(true);
    expect(links.some((link) => link.href === "/profile")).toBe(true);
    expect(links.some((link) => link.href === "/request")).toBe(false);
    expect(links.some((link) => link.href === "/tracking")).toBe(false);
    expect(links.some((link) => link.href?.startsWith("/reports"))).toBe(false);
    expect(links.some((link) => link.href === "/notifications")).toBe(false);
  });
});
