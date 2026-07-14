import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("OrganizationSiteMap", () => {
  it("keeps the organization chart as an interactive client-side UI only component", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain('"use client"');
    expect(source).toContain("OrganizationSiteMap");
    expect(source).toContain("org-chart-canvas");
    expect(source).toContain("Company structure");
    expect(source).toContain("Search organization, site, or user");
    expect(source).toContain("View selector");
  });

  it("supports the requested chart controls without changing server data loading", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("setViewMode");
    expect(source).toContain("Zoom In");
    expect(source).toContain("Zoom Out");
    expect(source).toContain("Fit Screen");
    expect(source).toContain("Fullscreen");
    expect(source).not.toContain("onWheel={wheelZoom}");
    expect(source).not.toContain("wheelZoom");
    expect(source).toContain("onPointerDown={startDrag}");
    expect(source).toContain("Expand All");
    expect(source).toContain("Collapse All");
    expect(source).toContain("router.refresh()");
  });

  it("visually separates organization, site, and person nodes", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("org-chart-organization");
    expect(source).toContain("org-chart-site");
    expect(source).toContain("org-chart-person");
    expect(source).toContain("Owner Admin");
    expect(source).toContain("Organization Admin");
    expect(source).toContain("Site Admin");
    expect(source).toContain("Member");
    expect(source).toContain("Public Requester");
    expect(source).toContain("roleBadgeClass");
  });

  it("uses fixed hierarchy colors instead of rotating colors by item order", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("hierarchyAccent");
    expect(source).toContain('owner: "bg-violet-600"');
    expect(source).toContain('organization: "bg-blue-500"');
    expect(source).toContain('organizationAdmin: "bg-indigo-500"');
    expect(source).toContain('site: "bg-emerald-500"');
    expect(source).toContain('siteAdmin: "bg-amber-500"');
    expect(source).toContain('member: "bg-slate-400"');
    expect(source).toContain('public: "bg-cyan-500"');
    expect(source).not.toContain("organizationAccent(");
    expect(source).not.toContain("siteAccent(");
  });

  it("combines organization and site admin status into their parent cards", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("adminNames={organizationAdmins.map");
    expect(source).toContain('adminRoleLabel="Organization Admin"');
    expect(source).toContain("adminNames={siteAdmins.map");
    expect(source).toContain('adminRoleLabel="Site Admin"');
    expect(source).toContain("No Admin");
    expect(source).toContain("bg-slate-300");
    expect(source).not.toContain("<SectionLabel>Organization Admin</SectionLabel>");
    expect(source).not.toContain("<SectionLabel>Site Admin</SectionLabel>");
  });

  it("starts the visible hierarchy at the signed-in user's role level", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("viewerRole = RoleName.ADMIN");
    expect(source).toContain("const showOwnerNode = viewerRole === RoleName.ADMIN");
    expect(source).toContain("const showOrganizationLevel = !isSiteAdminRole(viewerRole)");
    expect(source).toContain("if (!showOrganizationLevel)");
    expect(source).toContain("showOwnerNode && ownerRail");
  });

  it("lays out sites horizontally under each organization with connector rails", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("site-branch-row");
    expect(source).toContain("relative w-max pt-8");
    expect(source).toContain("flex w-max items-start");
    expect(source).toContain("overflow-visible");
    expect(source).toContain("w-fit min-w-[390px]");
    expect(source).toContain("w-[340px] shrink-0 pt-8");
    expect(source).toContain("org-chart-rail");
    expect(source).toContain("[data-org-card='true']");
    expect(source).toContain('data-org-card={dataOrgCard ? "true" : undefined}');
    expect(source).toContain("h-[3px]");
    expect(source).toContain("w-[3px]");
    expect(source).toContain("color-mix(in_srgb,var(--line)_58%,var(--ink)_42%)");
  });

  it("uses minimal styling for the chart shell, panels, and nodes", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("minimal-shell");
    expect(source).toContain("minimal-panel");
    expect(source).toContain("minimal-node");
    expect(source).toContain("bg-[var(--surface)]");
    expect(source).toContain("border-[var(--line)]");
    expect(source).not.toContain("backdrop-blur");
    expect(source).not.toContain("liquid-glass");
  });

  it("opens an inline user settings drawer from organization member nodes", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("OrganizationUserDrawer");
    expect(source).toContain("User Settings");
    expect(source).toContain("onSelect={canOpenUserDrawer");
    expect(source).toContain("onAdminSelect={canOpenUserDrawer");
    expect(source).toContain("adminUser={organizationAdmins[0]}");
    expect(source).toContain("adminUser={siteAdmins[0]}");
    expect(source).toContain("AdminUserRoleScopeController");
    expect(source).toContain("ProfilePhotoPreview");
    expect(source).toContain("Save user");
  });

  it("does not let canvas dragging swallow clicks on user and admin controls", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("isInteractiveTarget(event.target)");
    expect(source).toContain("function isInteractiveTarget");
    expect(source).toContain("a,button,input,select,textarea,label,summary,[role='button']");
  });

  it("opens a create-user drawer from missing organization or site admin cards", () => {
    const source = readFileSync("components/organization-site-map.tsx", "utf8");

    expect(source).toContain("OrganizationCreateUserDrawer");
    expect(source).toContain("selectedCreateUser");
    expect(source).toContain("onCreateAdmin");
    expect(source).toContain("Create Site Admin");
    expect(source).toContain("Create Organization Admin");
    expect(source).toContain("createUserAction");
    expect(source).toContain("<PlusCircle");
  });
});
