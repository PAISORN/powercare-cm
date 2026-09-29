import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SettingsPreferencesForm } from "./settings-preferences-form";

const preferenceCookies = [
  "powercare-theme",
  "powercare-background",
  "powercare-background-blur",
  "powercare-background-brightness",
  "powercare-language",
];

afterEach(() => {
  for (const cookie of preferenceCookies) {
    document.cookie = `${cookie}=; path=/; max-age=0`;
  }
  delete document.documentElement.dataset.themePreference;
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.background;
  document.documentElement.style.removeProperty("--background-blur");
  document.documentElement.style.removeProperty("--background-brightness");
  document.documentElement.lang = "";
});

describe("SettingsPreferencesForm", () => {
  it("applies and persists the selected display and image preferences", () => {
    render(
      <SettingsPreferencesForm
        initialBackground="original"
        initialBackgroundBlur={12}
        initialBackgroundBrightness={100}
        initialLanguage="th"
        initialTheme="auto"
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /กลางคืน/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Blue Mist/ }));
    fireEvent.change(screen.getByRole("slider", { name: "ความเบลอของภาพพื้นหลัง" }), { target: { value: "24" } });
    fireEvent.change(screen.getByRole("slider", { name: "ความสว่างของภาพพื้นหลัง" }), { target: { value: "82" } });
    fireEvent.click(screen.getByRole("button", { name: /บันทึกการตั้งค่า/ }));

    expect(document.documentElement.dataset.themePreference).toBe("night");
    expect(document.documentElement.dataset.theme).toBe("night");
    expect(document.documentElement.dataset.background).toBe("image-blue-mist");
    expect(document.documentElement.style.getPropertyValue("--background-blur")).toBe("24px");
    expect(document.documentElement.style.getPropertyValue("--background-brightness")).toBe("82%");
    expect(document.documentElement.lang).toBe("th");
    expect(document.cookie).toContain("powercare-theme=night");
    expect(document.cookie).toContain("powercare-background=image-blue-mist");
    expect(document.cookie).toContain("powercare-background-blur=24");
    expect(document.cookie).toContain("powercare-background-brightness=82");
    expect(screen.getByText("บันทึกการตั้งค่าเรียบร้อยแล้ว")).toBeTruthy();
  });

  it("restores the default selections and image controls before saving", () => {
    render(
      <SettingsPreferencesForm
        initialBackground="image-prism-cloud"
        initialBackgroundBlur={28}
        initialBackgroundBrightness={72}
        initialLanguage="th"
        initialTheme="night"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /คืนค่าเริ่มต้น/ }));

    expect((screen.getByRole("radio", { name: /อัตโนมัติ/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("radio", { name: /พื้นหลังเดิม/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("slider", { name: "ความเบลอของภาพพื้นหลัง" }) as HTMLInputElement).value).toBe("12");
    expect((screen.getByRole("slider", { name: "ความสว่างของภาพพื้นหลัง" }) as HTMLInputElement).value).toBe("100");
    expect((screen.getByRole("radio", { name: /ภาษาไทย/ }) as HTMLInputElement).checked).toBe(true);
  });
});