import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPreferencesForm } from "./settings-preferences-form";

const { savePreferences } = vi.hoisted(() => ({ savePreferences: vi.fn() }));
vi.mock("../app/settings/actions", () => ({ saveDisplayPreferences: savePreferences }));
beforeEach(() => { savePreferences.mockReset(); savePreferences.mockResolvedValue({ ok: true }); });

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
  it("reflects a theme change made by the navbar without writing another account", async () => {
    render(<SettingsPreferencesForm initialBackground="original" initialBackgroundBlur={12} initialBackgroundBrightness={100} initialLanguage="th" initialTheme="night" />);
    document.documentElement.dataset.themePreference = "day";
    await waitFor(() => expect((screen.getByRole("radio", { name: /^สว่าง/ }) as HTMLInputElement).checked).toBe(true));
    expect(savePreferences).not.toHaveBeenCalled();
  });
  it("selects website photos, previews them, and saves a readable photo default", async () => {
    render(<SettingsPreferencesForm initialBackground="original" initialBackgroundBlur={2} initialBackgroundBrightness={100} initialLanguage="th" initialTheme="day" />);
    fireEvent.click(screen.getByRole("radio", { name: /ช่างซ่อมบำรุง/ }));
    expect(document.documentElement.dataset.background).toBeUndefined();
    expect((screen.getByRole("slider", { name: "ความเบลอของภาพพื้นหลัง" }) as HTMLInputElement).value).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: /บันทึกการตั้งค่า/ }));
    await waitFor(() => expect(document.documentElement.dataset.background).toBe("image-maintenance"));
    expect(savePreferences).toHaveBeenCalledWith(expect.objectContaining({ background: "image-maintenance", backgroundBlur: 2 }), "");
    expect(document.documentElement.style.getPropertyValue("--background-blur")).toBe("2px");
    fireEvent.click(screen.getByRole("radio", { name: /โรงงานอุตสาหกรรม/ }));
    fireEvent.click(screen.getByRole("button", { name: /บันทึกการตั้งค่า/ }));
    await waitFor(() => expect(document.documentElement.dataset.background).toBe("image-industrial-campus"));
  });

  it("does not overwrite custom blur when choosing a website photo", () => {
    render(<SettingsPreferencesForm initialBackground="image-prism-cloud" initialBackgroundBlur={24} initialBackgroundBrightness={82} initialLanguage="th" initialTheme="night" />);
    fireEvent.click(screen.getByRole("radio", { name: /ช่างซ่อมบำรุง/ }));
    expect((screen.getByRole("slider", { name: "ความเบลอของภาพพื้นหลัง" }) as HTMLInputElement).value).toBe("24");
  });
  it("applies and persists the selected display and image preferences", async () => {
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

    await waitFor(() => expect(document.documentElement.dataset.themePreference).toBe("night"));
    expect(document.documentElement.dataset.theme).toBe("night");
    expect(document.documentElement.dataset.background).toBe("image-blue-mist");
    expect(document.documentElement.style.getPropertyValue("--background-blur")).toBe("24px");
    expect(document.documentElement.style.getPropertyValue("--background-brightness")).toBe("82%");
    expect(document.documentElement.lang).toBe("th");
    expect(savePreferences).toHaveBeenCalledWith({ theme: "night", background: "image-blue-mist", backgroundBlur: 24, backgroundBrightness: 82, language: "th" }, "");
    expect(document.cookie).not.toContain("powercare-background=");
    expect(screen.getByText("บันทึกการตั้งค่าเรียบร้อยแล้ว")).toBeTruthy();
  });

  it("does not apply or announce unsaved preferences when persistence fails", async () => {
    savePreferences.mockResolvedValue({ ok: false, error: "บันทึกไม่สำเร็จ" });
    render(<SettingsPreferencesForm initialBackground="original" initialBackgroundBlur={12} initialBackgroundBrightness={100} initialLanguage="th" initialTheme="auto" />);
    fireEvent.click(screen.getByRole("radio", { name: /ห้องควบคุม/ }));
    fireEvent.click(screen.getByRole("button", { name: /บันทึกการตั้งค่า/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("บันทึกไม่สำเร็จ"));
    expect(document.documentElement.dataset.background).toBeUndefined();
    expect(screen.queryByText("บันทึกการตั้งค่าเรียบร้อยแล้ว")).toBeNull();
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
    expect((screen.getByRole("radio", { name: /ช่างซ่อมบำรุง/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("slider", { name: "ความเบลอของภาพพื้นหลัง" }) as HTMLInputElement).value).toBe("0");
    expect((screen.getByRole("slider", { name: "ความสว่างของภาพพื้นหลัง" }) as HTMLInputElement).value).toBe("100");
    expect((screen.getByRole("radio", { name: /ภาษาไทย/ }) as HTMLInputElement).checked).toBe(true);
  });
});
