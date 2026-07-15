import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SparePartBarcodeScanner } from "./spare-part-barcode-scanner";

describe("SparePartBarcodeScanner", () => {
  it("supports manual barcode entry when camera scanning is unavailable", () => {
    const onSelect = vi.fn();
    render(
      <SparePartBarcodeScanner
        onSelect={onSelect}
        options={[{
          stockKey: "store-1:part-1",
          itemCode: "ACC-6208",
          sparePartCode: "SP-RTB-00001",
          sparePartName: "Bearing 6208",
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "สแกนบาร์โค้ต" }));
    fireEvent.change(screen.getByLabelText("กรอกรหัสแทนการสแกน"), { target: { value: "acc-6208" } });
    fireEvent.click(screen.getByRole("button", { name: "เลือก" }));

    expect(onSelect).toHaveBeenCalledWith("store-1:part-1");
  });
});
