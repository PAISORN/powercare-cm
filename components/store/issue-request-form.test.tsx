import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IssueRequestForm } from "./issue-request-form";

const stocks = [
  {
    storeId: "store-main",
    sparePartId: "bearing",
    label: "SP-RTB-00001 / Bearing 6208 / Main Warehouse",
    available: 12,
    unit: "PCS",
    storeCode: "MAIN",
    storeName: "Main Warehouse",
    storeCategoryName: "Mechanical Store",
    sparePartCode: "SP-RTB-00001",
    sparePartName: "Bearing 6208",
    sparePartTypeName: "General spare part",
    sparePartCategoryName: "Mechanical",
    itemCode: "ACC-6208",
    stockStatus: "ENOUGH" as const,
  },
  {
    storeId: "store-elec",
    sparePartId: "cable",
    label: "SP-RTB-00002 / Cable THW / Electrical Warehouse",
    available: 1,
    unit: "M",
    storeCode: "ELEC",
    storeName: "Electrical Warehouse",
    storeCategoryName: "Electrical Store",
    sparePartCode: "SP-RTB-00002",
    sparePartName: "Cable THW",
    sparePartTypeName: "Consumable",
    sparePartCategoryName: "Electrical",
    itemCode: null,
    stockStatus: "LOW" as const,
  },
];

const issueZones = [
  { id: "zone-boiler", name: "Boiler", code: "01" },
  { id: "zone-turbine", name: "Turbine", code: "02" },
];

describe("IssueRequestForm", () => {
  function chooseStock(searchInput: HTMLElement, query: string, optionName: RegExp) {
    fireEvent.change(searchInput, { target: { value: query } });
    const option = screen.getByRole("option", { name: optionName });
    fireEvent.mouseDown(option);
    fireEvent.click(option);
  }

  it("locks CM work requests and uses the Site-level Applicable Zones at issue time", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    expect(container.querySelector('input[name="issueType"]')?.getAttribute("value")).toBe("CM_REFERENCED");
    expect(container.querySelector('input[name="cmWorkNumber"]')?.getAttribute("value")).toBe("CM-2026-07-0001");
    expect(screen.getByLabelText("Search spare parts")).toBeTruthy();

    chooseStock(screen.getByLabelText("ค้นหาและเลือกอะไหล่ รายการ 1"), "Bearing", /Bearing 6208/);
    const zoneSelect = container.querySelector('select[name="zoneId"]') as HTMLSelectElement;
    expect(zoneSelect.disabled).toBe(false);
    expect([...zoneSelect.options].map((option) => option.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("01"), expect.stringContaining("02")]),
    );
  });

  it("filters stock choices by search text before requesting parts", () => {
    render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    fireEvent.focus(screen.getByLabelText("ค้นหาและเลือกอะไหล่ รายการ 1"));
    expect(screen.getByRole("option", { name: /Bearing 6208/ })).toBeTruthy();
    expect(screen.getByRole("option", { name: /Cable THW/ })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Search spare parts"), { target: { value: "ACC-6208" } });

    expect(screen.getByRole("option", { name: /Bearing 6208/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Cable THW/ })).toBeNull();
  });

  it("filters issue choices by the spare part type instead of the store category", () => {
    render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    const typeSelect = screen.getByLabelText("ประเภท") as HTMLSelectElement;
    expect([...typeSelect.options].map((option) => option.textContent)).toEqual(
      expect.arrayContaining(["General spare part", "Consumable"]),
    );

    fireEvent.change(typeSelect, { target: { value: "Consumable" } });
    fireEvent.focus(screen.getByLabelText("ค้นหาและเลือกอะไหล่ รายการ 1"));

    expect(screen.queryByRole("option", { name: /Bearing 6208/ })).toBeNull();
    expect(screen.getByRole("option", { name: /Cable THW/ })).toBeTruthy();
  });

  it("allows requesting the final unit when available stock is one", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    chooseStock(screen.getByLabelText("ค้นหาและเลือกอะไหล่ รายการ 1"), "Cable", /Cable THW/);

    const quantityInput = container.querySelector('input[name="requestedQty"]') as HTMLInputElement;
    expect(quantityInput.min).toBe("1");
    expect(quantityInput.max).toBe("1");
    expect(quantityInput.step).toBe("1");
  });

  it("keeps selected spare-part fields in the form while reviewing the request", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    chooseStock(screen.getByLabelText("ค้นหาและเลือกอะไหล่ รายการ 1"), "Bearing", /Bearing 6208/);
    fireEvent.change(container.querySelector('select[name="zoneId"]')!, {
      target: { value: "zone-boiler" },
    });
    fireEvent.change(container.querySelector('input[name="requestedQty"]')!, {
      target: { value: "1" },
    });

    const reviewButton = [...container.querySelectorAll<HTMLButtonElement>('button[type="button"]')].at(-1);
    expect(reviewButton).toBeTruthy();
    fireEvent.click(reviewButton!);

    const formData = new FormData(container.querySelector("form")!);
    expect(formData.getAll("stockKey")).toEqual(["store-main:bearing"]);
    expect(formData.getAll("zoneId")).toEqual(["zone-boiler"]);
    expect(formData.getAll("requestedQty")).toEqual(["1"]);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("ยืนยันรายการเบิกอะไหล่")).toBeTruthy();
    expect(screen.getByRole("button", { name: /ยืนยันการเบิก/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /ย้อนกลับไปแก้ไข/ })).toBeTruthy();
  });

  it("keeps search and selection independent for multiple issue lines", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /เพิ่มรายการ/ }));
    const firstSearch = screen.getByLabelText("ค้นหาและเลือกอะไหล่ รายการ 1");
    const secondSearch = screen.getByLabelText("ค้นหาและเลือกอะไหล่ รายการ 2");
    chooseStock(firstSearch, "Bearing", /Bearing 6208/);
    chooseStock(secondSearch, "Cable", /Cable THW/);

    expect((firstSearch as HTMLInputElement).value).toMatch(/Bearing 6208/);
    expect((secondSearch as HTMLInputElement).value).toMatch(/Cable THW/);
    expect([...container.querySelectorAll<HTMLInputElement>('input[name="stockKey"]')].map((input) => input.value)).toEqual([
      "store-main:bearing",
      "store-elec:cable",
    ]);
  });

  it("supports keyboard search and selection in each stock autocomplete", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    const searchInput = screen.getByLabelText("ค้นหาและเลือกอะไหล่ รายการ 1");
    fireEvent.change(searchInput, { target: { value: "ACC-6208" } });
    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect((searchInput as HTMLInputElement).value).toMatch(/Bearing 6208/);
    expect(container.querySelector<HTMLInputElement>('input[name="stockKey"]')?.value).toBe("store-main:bearing");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("renders the create page as one card with a normal form footer", () => {
    render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        singleCard
        stocks={stocks}
      />,
    );

    const form = screen.getByTestId("issue-request-form");
    const reviewButton = screen.getByRole("button", { name: /ถัดไป: ตรวจสอบและยืนยัน/ });
    expect(reviewButton.parentElement?.className).not.toContain("sticky");
    expect(form.querySelectorAll("section.rounded-2xl")).toHaveLength(0);
  });

  it("renders stock suggestions in a portal above the form", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        issueZones={issueZones}
        lockedCmWork={{ id: "cm-1", number: "CM-2026-07-0001", label: "Pump vibration" }}
        organizationId="org-1"
        plantId="plant-1"
        stocks={stocks}
      />,
    );

    fireEvent.focus(screen.getByLabelText("ค้นหาและเลือกอะไหล่ รายการ 1"));
    const listbox = screen.getByRole("listbox");
    expect(container.contains(listbox)).toBe(false);
    expect(listbox.className).toContain("z-[200]");
  });

  it("collects public requester identity and exposes barcode scanning", () => {
    const { container } = render(
      <IssueRequestForm
        action={vi.fn()}
        cmWorks={[]}
        inventoryCode="RTB"
        issueZones={issueZones}
        organizationId="org-1"
        plantId="plant-1"
        publicRequester={{ contactRequired: false }}
        stocks={stocks}
      />,
    );

    expect(container.querySelector('input[name="requesterName"]')).toBeTruthy();
    expect(container.querySelector('input[name="requesterDepartment"]')).toBeTruthy();
    expect(container.querySelector('input[name="requesterContact"]')?.hasAttribute("required")).toBe(false);
    expect(screen.getByRole("button", { name: "สแกนบาร์โค้ต" })).toBeTruthy();
  });
});
