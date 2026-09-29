import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PmWeeklyPatternFields } from "./pm-weekly-pattern-fields";

const targets = [
  { id: "ash", label: "ASH · ASH Handling", active: true },
  { id: "bol", label: "BOL · Boiler", active: true },
  { id: "esp", label: "ESP · ESP", active: true },
];
type Pattern = { dayOfWeek: number; weekIndex: number; assetSystemId: string | null; zoneId: string | null };

function renderFields(patterns: Pattern[] = [], pmBy = "SYSTEM", initialCycleWeeks = 1) {
  const view = render(<form data-testid="pattern-form"><PmWeeklyPatternFields weekdays={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]} targets={targets} patterns={patterns} pmBy={pmBy} year={2027} initialCycleWeeks={initialCycleWeeks} initialAnchorDateKey={initialCycleWeeks === 2 ? "2026-12-28" : null} /></form>);
  const formData = () => new FormData(screen.getByTestId("pattern-form") as HTMLFormElement);
  const values = () => formData().getAll("pattern");
  return { ...view, formData, values };
}

describe("PmWeeklyPatternFields", () => {
  it("shows saved targets and submits all selected targets for each day", () => {
    const { values } = renderFields([
      { weekIndex: 1, dayOfWeek: 1, assetSystemId: "ash", zoneId: null },
      { weekIndex: 1, dayOfWeek: 1, assetSystemId: "bol", zoneId: null },
      { weekIndex: 1, dayOfWeek: 3, assetSystemId: "esp", zoneId: null },
    ]);
    expect((screen.getByRole("combobox", { name: "Mon System 1" }) as HTMLSelectElement).value).toBe("ash");
    expect((screen.getByRole("combobox", { name: "Mon System 2" }) as HTMLSelectElement).value).toBe("bol");
    expect(values()).toEqual(["1:1:ash", "1:1:bol", "1:3:esp"]);
  });

  it("supports separate Week A and B targets for the same weekday", () => {
    const { formData, values } = renderFields([
      { weekIndex: 1, dayOfWeek: 3, assetSystemId: "ash", zoneId: null },
      { weekIndex: 2, dayOfWeek: 3, assetSystemId: "bol", zoneId: null },
    ], "SYSTEM", 2);
    expect((screen.getByRole("combobox", { name: "Week A Wed System 1" }) as HTMLSelectElement).value).toBe("ash");
    expect((screen.getByRole("combobox", { name: "Week B Wed System 1" }) as HTMLSelectElement).value).toBe("bol");
    expect(values()).toEqual(["1:3:ash", "2:3:bol"]);
    expect(formData().get("patternCycleWeeks")).toBe("2");
    expect(formData().get("rotationAnchorDateKey")).toBe("2026-12-28");
  });

  it("switches from weekly to two-week rotation without losing Week A or submitting empty rows", () => {
    const { formData, values } = renderFields([{ weekIndex: 1, dayOfWeek: 3, assetSystemId: "ash", zoneId: null }]);
    fireEvent.change(screen.getByRole("combobox", { name: "รูปแบบการวนซ้ำ" }), { target: { value: "2" } });
    expect((screen.getByRole("combobox", { name: "Week A Wed System 1" }) as HTMLSelectElement).value).toBe("ash");
    expect(screen.queryByRole("combobox", { name: "Week B Mon System 1" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Week B Wed System 1" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "สลับ Wed" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Week B Wed System 1" }), { target: { value: "bol" } });
    expect(values()).toEqual(["1:3:ash", "2:3:bol"]);
    expect(formData().get("patternCycleWeeks")).toBe("2");
  });

  it("can return one alternating day to the Week A baseline", () => {
    const { values } = renderFields([
      { weekIndex: 1, dayOfWeek: 1, assetSystemId: "ash", zoneId: null },
      { weekIndex: 2, dayOfWeek: 1, assetSystemId: "bol", zoneId: null },
    ], "SYSTEM", 2);
    fireEvent.click(screen.getByRole("button", { name: "ใช้ Week A ตามเดิม" }));
    expect(values()).toEqual(["1:1:ash"]);
    expect(screen.queryByRole("combobox", { name: "Week B Mon System 1" })).toBeNull();
  });

  it("adds and removes dropdown rows without submitting duplicate targets", () => {
    const { values } = renderFields();
    expect(values()).toEqual([]);
    fireEvent.change(screen.getByRole("combobox", { name: "Mon System 1" }), { target: { value: "ash" } });
    fireEvent.click(screen.getAllByRole("button", { name: "เพิ่มรายการ" })[1]);
    const second = screen.getByRole("combobox", { name: "Mon System 2" }) as HTMLSelectElement;
    expect((Array.from(second.options).find(option => option.value === "ash") as HTMLOptionElement).disabled).toBe(true);
    fireEvent.change(second, { target: { value: "bol" } });
    expect(values()).toEqual(["1:1:ash", "1:1:bol"]);
    fireEvent.click(screen.getByRole("button", { name: "ลบ Mon System 1" }));
    expect(values()).toEqual(["1:1:bol"]);
  });

  it("shows Sunday first while submitting its original weekday number", () => {
    const { values } = renderFields([{ weekIndex: 1, dayOfWeek: 7, assetSystemId: "ash", zoneId: null }]);
    const options = screen.getAllByRole("combobox").filter(element => element.getAttribute("aria-label"));
    expect(options[0].getAttribute("aria-label")).toBe("Sun System 1");
    expect((screen.getByRole("combobox", { name: "Sun System 1" }) as HTMLSelectElement).value).toBe("ash");
    expect(values()).toEqual(["1:7:ash"]);
  });

  it("preserves saved Zone / Area choices", () => {
    const { values } = renderFields([{ weekIndex: 1, dayOfWeek: 1, assetSystemId: null, zoneId: "esp" }], "ZONE");
    expect((screen.getByRole("combobox", { name: "Mon Zone / Area 1" }) as HTMLSelectElement).value).toBe("esp");
    expect(values()).toEqual(["1:1:esp"]);
  });
});