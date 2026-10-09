import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { TechnicalFieldTree } from "./technical-field-tree";

const types = [{
  id: "motor",
  code: "MOT",
  name: "Motor",
  addHref: "/assets/master-data?tab=fields&newFieldTypeId=motor",
  fields: [{
    id: "rated-power",
    label: "กำลังไฟฟ้า",
    dataType: "NUMBER",
    unit: "kW",
    active: true,
    valuesCount: 3,
    editHref: "/assets/master-data?tab=fields&editFieldId=rated-power",
  }],
}];

describe("TechnicalFieldTree", () => {
  it("starts collapsed and renders Asset-style tree controls", () => {
    render(<TechnicalFieldTree types={types}/>);

    const tree = screen.getByRole("region", { name: "Technical Field Templates tree" });
    expect(tree).toBeInTheDocument();
    expect(tree).not.toHaveClass("rounded-2xl", "border", "bg-white", "shadow-sm");
    expect(screen.getByRole("columnheader", { name: "Technical Field Templates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ขยาย Motor" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "กำลังไฟฟ้า" })).not.toBeInTheDocument();
  });

  it("expands individual types and keeps add and edit links", () => {
    render(<TechnicalFieldTree types={types}/>);

    fireEvent.click(screen.getByRole("button", { name: "ขยาย Motor" }));
    expect(screen.getByRole("link", { name: "กำลังไฟฟ้า" })).toHaveAttribute("href", "/assets/master-data?tab=fields&editFieldId=rated-power");
    expect(screen.getByRole("link", { name: "เพิ่มรายการ" })).toHaveAttribute("href", "/assets/master-data?tab=fields&newFieldTypeId=motor");
    expect(screen.getByText("ตัวเลข")).toBeInTheDocument();
    expect(screen.getByText("kW")).toBeInTheDocument();
  });

  it("expands and collapses every type from the toolbar", () => {
    render(<TechnicalFieldTree types={types}/>);

    fireEvent.click(screen.getByRole("button", { name: "ขยายทั้งหมด" }));
    expect(screen.getByRole("link", { name: "กำลังไฟฟ้า" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ย่อทั้งหมด" }));
    expect(screen.queryByRole("link", { name: "กำลังไฟฟ้า" })).not.toBeInTheDocument();
  });
});
