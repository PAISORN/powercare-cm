import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AdminSiteScope } from "../../modules/admin/admin-site-scope";
import { PmRouteShell, type PmPage } from "./pm-route-shell";

function makeScope(overrides: Partial<AdminSiteScope> = {}): AdminSiteScope {
  return {
    organization: { id: "org-a", name: "Organization A", slug: "org-a" },
    plant: { id: "site-a", name: "Site A", code: "SA" },
    organizations: [{ id: "org-a", name: "Organization A", slug: "org-a" }],
    plants: [{ id: "site-a", name: "Site A", code: "SA" }],
    canSelectOrganization: false,
    canSelectPlant: false,
    ...overrides,
  };
}

function renderShell({
  scope = makeScope(),
  currentPage = "calendar",
  canManageGroups = true,
}: {
  scope?: AdminSiteScope;
  currentPage?: PmPage;
  canManageGroups?: boolean;
} = {}) {
  return render(
    <PmRouteShell
      canManageGroups={canManageGroups}
      currentPage={currentPage}
      description="Phase placeholder"
      scope={scope}
      scopeAction="/dashboardpm"
      title="PM"
    />,
  );
}

describe("PmRouteShell", () => {
  it("shows the scope selector only when the role can select an Organization or Site", () => {
    const { rerender } = renderShell({ scope: makeScope({ canSelectPlant: true }) });
    expect(screen.getByText("PM scope")).toBeInTheDocument();

    rerender(
      <PmRouteShell
        canManageGroups
        currentPage="calendar"
        description="Phase placeholder"
        scope={makeScope()}
        scopeAction="/dashboardpm"
        title="PM"
      />,
    );
    expect(screen.queryByText("PM scope")).not.toBeInTheDocument();
  });

  it("preserves the resolved scope in every PM navigation href", () => {
    renderShell();
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute("href", "/dashboardpm?organizationId=org-a&plantId=site-a");
    expect(screen.getByRole("link", { name: "Groups" })).toHaveAttribute("href", "/dashboardpm/groups?organizationId=org-a&plantId=site-a");
    expect(screen.getByRole("link", { name: "Work" })).toHaveAttribute("href", "/dashboardpm/work?organizationId=org-a&plantId=site-a");
  });

  it("marks only the exact current PM page as active", () => {
    renderShell({ currentPage: "work" });
    expect(screen.getByRole("link", { name: "Work" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Calendar" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Groups" })).not.toHaveAttribute("aria-current");
  });

  it("hides Groups from viewers without PM Group management permission", () => {
    renderShell({ canManageGroups: false });
    expect(screen.queryByRole("link", { name: "Groups" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Work" })).toBeInTheDocument();
  });
});
