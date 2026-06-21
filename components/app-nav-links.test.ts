import { describe, expect, it } from "vitest";
import { RoleName } from "../modules/cm-work/cm-work-types";
import { getAppLinks } from "./app-nav-links";

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
});
