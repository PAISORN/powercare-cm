import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { AssetTreeWorkspace, type AssetTreeItem } from "./asset-tree-workspace";

function item(id: string, code: string, name: string, children: AssetTreeItem[] = [], levelLabel?: string): AssetTreeItem {
  return {
    id,
    systemId: "turbine",
    systemName: "Turbine",
    assetLevel: levelLabel === "Sub-Asset" ? "SUB_ASSET" : levelLabel === "Part-Asset" || id !== "main" ? "PART" : "MAIN_ASSET",
    code,
    name,
    levelLabel: levelLabel || (id === "main" ? "Main Asset" : "Part-Asset"),
    areaZone: "Turbine",
    cmStatus: "CLOSED",
    cmStatusDetail: "1 ม.ค. 2569",
    pmStatus: "PLANNED",
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

  it("renders the hierarchy as six aligned columns with links to Asset details", () => {
    render(<AssetTreeWorkspace siteCode="RTB" systems={systems} review={[]}/>);

    expect(screen.getByRole("region", { name: "Tree Assets" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Tree Assets" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "CODE ASSET" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ASSET LEVEL" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "AREA / ZONE" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "สถานะ PM / CM" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "เมนูเพิ่มเติม" })).toBeInTheDocument();
    expect(screen.getByText("System")).toHaveClass("bg-violet-100");
    expect(screen.queryByRole("link", { name: "Gland Vent Condenser" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ขยาย Turbine" }));
    expect(screen.getByRole("button", { name: /ขยาย MA-GVC-001/ })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: /ขยาย MA-GVC-001/ }));
    expect(screen.getByRole("link", { name: "Sealing Gland Vent Exhaust" })).toHaveAttribute("href", "/assets/part");
    expect(screen.getByRole("link", { name: "PA-GVC-001-02" })).toHaveAttribute("href", "/assets/part");
    expect(screen.getAllByText("CM: ปิดงานแล้ว · 1 ม.ค. 2569")).toHaveLength(2);
    expect(screen.getAllByText("PM: วางแผนแล้ว")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /เมนูเพิ่มเติม/ })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /เมนูเพิ่มเติม/ })[0]).toBeEnabled();
    expect(screen.getAllByText("Turbine").length).toBeGreaterThan(1);
    expect(screen.getByText("Part-Asset")).toBeInTheDocument();
  });

  it("shows counts for direct branches under each System and Main Asset", () => {
    const sub = item("sub", "SA-GVC-001-01", "Motor Gland Vent Condenser", [], "Sub-Asset");
    const directPart = item("direct-part", "PA-TUR-001", "Direct Turbine Part");
    const countedMain = item("main", "MA-GVC-001", "Gland Vent Condenser", [sub, part]);
    render(<AssetTreeWorkspace siteCode="RTB" systems={[{ ...systems[0], branches: [countedMain, directPart] }]} review={[]}/>);

    expect(screen.getByText("Main Asset 1 รายการ · Part-Asset 1 รายการ")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ขยาย Turbine" }));
    expect(screen.getByText("Sub-Asset 1 รายการ · Part-Asset 1 รายการ")).toBeInTheDocument();
    expect(screen.getByText("Main Asset")).toHaveClass("bg-blue-100");
    expect(screen.getByText("Part-Asset")).toHaveClass("bg-emerald-100");
    fireEvent.click(screen.getByRole("button", { name: /ขยาย MA-GVC-001/ }));
    expect(screen.getByText("Sub-Asset")).toHaveClass("bg-amber-100");
  });

  it("opens an add-item menu and a blurred right-side R8 drawer with levels allowed by the selected branch", () => {
    const createAction = async () => ({ status: "success" as const });
    const createOptions = {
      organizationId: "org",
      plantId: "plant",
      assetTypes: [{ id: "pump", code: "PMP", name: "Pump", discipline: "Mechanical" }],
      zones: [{ id: "zone", name: "Turbine" }],
    };
    render(<AssetTreeWorkspace canCreateAssets createAction={createAction} createOptions={createOptions} siteCode="RTB" systems={systems} review={[]}/>);

    fireEvent.click(screen.getByRole("button", { name: "เมนูเพิ่มเติม Turbine" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "เพิ่มรายการ" }));
    expect(screen.getByRole("dialog", { name: "เพิ่ม Asset ใน Tree" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ปิดแถบเพิ่ม Asset" })).toHaveClass("backdrop-blur-sm");
    expect(screen.getByLabelText("ASSET LEVEL").querySelectorAll("option")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "ปิด" }));

    fireEvent.click(screen.getByRole("button", { name: "ขยาย Turbine" }));
    fireEvent.click(screen.getByRole("button", { name: "เมนูเพิ่มเติม MA-GVC-001" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "เพิ่มรายการ" }));
    const levels = Array.from(screen.getByLabelText("ASSET LEVEL").querySelectorAll("option")).map(option => option.getAttribute("value"));
    expect(levels).toEqual(["SUB_ASSET", "PART"]);
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
