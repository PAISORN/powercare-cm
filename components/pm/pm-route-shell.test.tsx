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

  it("removes the redundant PM section tabs because navigation lives in the sidebar", () => {
    renderShell();
    expect(screen.queryByRole("navigation", { name: "PM sections" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Groups" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "PM Setup" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "PM Schedule" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "PM History" })).not.toBeInTheDocument();
  });
});
