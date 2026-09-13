import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { AssetTreeWorkspace, type AssetTreeItem } from "./asset-tree-workspace";

function item(id: string, code: string, name: string, children: AssetTreeItem[] = []): AssetTreeItem {
  return { id, code, name, levelLabel: id === "main" ? "Main Asset" : "Part-Asset", statusLabel: "ใช้งาน", criticalityLabel: "Critical", contextOnly: false, imageUrl: null, detailHref: `/assets/${id}`, details: [
    { label: "SYSTEM", value: "Turbine" }, { label: "MAIN ASSET", value: id === "main" ? name : "Gland Vent Condenser" }, { label: "SUB-ASSET", value: "" }, { label: "PART-ASSET", value: id === "part" ? name : "" }, { label: "CODE ASSET", value: code },
    { label: "ASSET LEVEL", value: id === "main" ? "Main Asset" : "Part-Asset" }, { label: "AREA / ZONE", value: "Turbine" }, { label: "ASSET TYPE", value: "Heater" }, { label: "DISCIPLINE", value: "Mechanical" }, { label: "CRITICALITY", value: "Critical" },
    { label: "MANUFACTURER", value: "Maker" }, { label: "MODEL / TYPE", value: "Model" }, { label: "SERIAL NO.", value: "SN-1" }, { label: "STATUS", value: "ใช้งาน" }, { label: "KEY SPECIFICATION", value: "Spec" },
  ], children };
}

describe("AssetTreeWorkspace", () => {
  const part = item("part", "PA-GVC-001-02", "Sealing Gland Vent Exhaust");
  const main = item("main", "MA-GVC-001", "Gland Vent Condenser", [part]);
  const systems = [{ id: "turbine", code: "TUR", name: "Turbine", branches: [main] }];

  it("shows an expandable System tree and updates the R8 detail panel when an Asset is selected", () => {
    render(<AssetTreeWorkspace siteCode="RTB" systems={systems} review={[]}/>);
    expect(screen.getByRole("region", { name: "Tree Assets" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ย่อ MA-GVC-001/ })).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "PA-GVC-001-02 Sealing Gland Vent Exhaust" }));
    expect(screen.getByRole("heading", { name: "Sealing Gland Vent Exhaust" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /เปิดรายละเอียด/ })).toHaveAttribute("href", "/assets/part");
    const details = screen.getByRole("heading", { name: "ข้อมูลตาม Asset R8" }).parentElement?.parentElement;
    expect(details).toBeTruthy();
    expect(within(details as HTMLElement).getByText("PART-ASSET")).toBeInTheDocument();
    expect(within(details as HTMLElement).getByText("PA-GVC-001-02")).toBeInTheDocument();
  });

  it("can collapse and expand the whole tree", () => {
    render(<AssetTreeWorkspace siteCode="RTB" systems={systems} review={[]}/>);
    fireEvent.click(screen.getByRole("button", { name: /ย่อทั้งหมด/ }));
    expect(screen.queryByRole("button", { name: "MA-GVC-001 Gland Vent Condenser" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /ขยายทั้งหมด/ }));
    expect(screen.getByRole("button", { name: "MA-GVC-001 Gland Vent Condenser" })).toBeInTheDocument();
  });
});
