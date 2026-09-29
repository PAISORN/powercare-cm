import { describe, expect, it } from "vitest";
import {
  parseBackgroundBlur,
  parseBackgroundBrightness,
  parseBackgroundPreference,
  parseLanguagePreference,
  parseThemePreference,
  resolveThemePreference,
} from "./user-preferences";

describe("user preferences", () => {
  it("accepts supported values and falls back safely", () => {
    expect(parseThemePreference("night")).toBe("night");
    expect(parseThemePreference("unknown")).toBe("auto");
    expect(parseBackgroundPreference("blue-gray")).toBe("blue-gray");
    expect(parseBackgroundPreference("image-prism-cloud")).toBe("image-prism-cloud");
    expect(parseBackgroundPreference("unknown")).toBe("original");
    expect(parseLanguagePreference("en")).toBe("th");
  });

  it("bounds background blur and brightness values", () => {
    expect(parseBackgroundBlur(undefined)).toBe(12);
    expect(parseBackgroundBlur("-10")).toBe(0);
    expect(parseBackgroundBlur("24")).toBe(24);
    expect(parseBackgroundBlur("999")).toBe(40);
    expect(parseBackgroundBrightness(undefined)).toBe(100);
    expect(parseBackgroundBrightness("20")).toBe(45);
    expect(parseBackgroundBrightness("118")).toBe(118);
    expect(parseBackgroundBrightness("999")).toBe(140);
  });

  it("resolves automatic theme using Bangkok time", () => {
    expect(resolveThemePreference("auto", new Date("2026-09-24T05:00:00.000Z"))).toBe("day");
    expect(resolveThemePreference("auto", new Date("2026-09-24T15:00:00.000Z"))).toBe("night");
    expect(resolveThemePreference("day", new Date("2026-09-24T15:00:00.000Z"))).toBe("day");
  });
});