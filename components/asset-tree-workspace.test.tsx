import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { AssetTreeWorkspace, type AssetTreeItem } from "./asset-tree-workspace";

function item(id: string, code: string, name: string, children: AssetTreeItem[] = [], levelLabel?: string): AssetTreeItem {
  return {
    id,
    code,
    name,
    levelLabel: levelLabel || (id === "main" ? "Main Asset" : "Part-Asset"),
    areaZone: "Turbine",
    statusLabel: "ใช้งาน",
    criticalityLabel: "Critical",
    contextOnly: false,
    imageUrl: null,
    detailHref: "/assets/" + id,
    details: [],
    children,
  };
}

describe("AssetTreeWorkspace", () => {
  const part = item("part", "PA-GVC-001-02", "Sealing Gland Vent Exhaust");
  const main = item("main", "MA-GVC-001", "Gland Vent Condenser", [part]);
  const systems = [{ id: "turbine", code: "TUR", name: "Turbine", branches: [main] }];

  it("renders the hierarchy as four aligned columns with links to Asset details", () => {
    render(<AssetTreeWorkspace siteCode="RTB" systems={systems} review={[]}/>);

    expect(screen.getByRole("region", { name: "Tree Assets" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tree Assets" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "CODE ASSET" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ASSET LEVEL" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "AREA / ZONE" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Gland Vent Condenser" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Turbine/ }));
    expect(screen.getByRole("button", { name: /ขยาย MA-GVC-001/ })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: /ขยาย MA-GVC-001/ }));
    expect(screen.getByRole("link", { name: "Sealing Gland Vent Exhaust" })).toHaveAttribute("href", "/assets/part");
    expect(screen.getByRole("link", { name: "PA-GVC-001-02" })).toHaveAttribute("href", "/assets/part");
    expect(screen.getAllByText("Turbine").length).toBeGreaterThan(1);
    expect(screen.getByText("Part-Asset")).toBeInTheDocument();
  });

  it("shows counts for direct branches under each System and Main Asset", () => {
    const sub = item("sub", "SA-GVC-001-01", "Motor Gland Vent Condenser", [], "Sub-Asset");
    const directPart = item("direct-part", "PA-TUR-001", "Direct Turbine Part");
    const countedMain = item("main", "MA-GVC-001", "Gland Vent Condenser", [sub, part]);
    render(<AssetTreeWorkspace siteCode="RTB" systems={[{ ...systems[0], branches: [countedMain, directPart] }]} review={[]}/>);

    expect(screen.getByText("Main Asset 1 รายการ · Part-Asset 1 รายการ")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Turbine/ }));
    expect(screen.getByText("Sub-Asset 1 รายการ · Part-Asset 1 รายการ")).toBeInTheDocument();
  });

  it("can collapse and expand the whole tree", () => {
    render(<AssetTreeWorkspace siteCode="RTB" systems={systems} review={[]}/>);

    expect(screen.queryByRole("link", { name: "Gland Vent Condenser" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ขยายทั้งหมด/ }));
    expect(screen.getByRole("link", { name: "Gland Vent Condenser" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ย่อทั้งหมด/ }));
    expect(screen.queryByRole("link", { name: "Gland Vent Condenser" })).not.toBeInTheDocument();
  });
});
