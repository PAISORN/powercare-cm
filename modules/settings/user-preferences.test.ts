import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  parseBackgroundBlur,
  parseBackgroundBrightness,
  parseBackgroundPreference,
  parseLanguagePreference,
  parseThemePreference,
  resolveThemePreference,
  parseDisplayPreferences,
} from "./user-preferences";

describe("user preferences", () => {
  it("keeps explicitly saved backgrounds and image controls instead of replacing them with the new default", () => {
    for (const background of ["original", "plain", "image-control-room"]) {
      expect(parseDisplayPreferences(JSON.stringify({ background, backgroundBlur: 12, backgroundBrightness: 82 }))).toMatchObject({ background, backgroundBlur: 12, backgroundBrightness: 82 });
    }
  });
  it("defaults malformed saved data and validates newly generated photo choices", () => {
    for (const input of [undefined, "{broken", "null", "[]"]) expect(parseDisplayPreferences(input)).toMatchObject({ background: "image-maintenance", backgroundBlur: 0 });
    for (const background of ["image-control-room", "image-plant-dawn", "image-mechanical-hall"]) {
      expect(parseDisplayPreferences(JSON.stringify({ background })).background).toBe(background);
    }
    expect(parseDisplayPreferences(JSON.stringify({ theme: "invalid", backgroundBlur: 999, backgroundBrightness: -1 }))).toMatchObject({ theme: "auto", backgroundBlur: 40, backgroundBrightness: 45 });
  });
  it("ships all three generated photos and matching CSS selectors", () => {
    const css = readFileSync("app/globals.css", "utf8");
    for (const name of ["control-room", "plant-dawn", "mechanical-hall"]) {
      expect(existsSync(`public/backgrounds/powercare-images/powercare-background-${name}.webp`)).toBe(true);
      expect(css).toContain(`html[data-background="image-${name}"] body::before`);
    }
  });
  it("maps website photos to existing local assets in the shared background renderer", () => {
    const css = readFileSync("app/globals.css", "utf8");
    for (const [value, image] of [["image-maintenance", "powercare-maintenance-hero.webp"], ["image-industrial-campus", "powercare-industrial-campus.webp"]]) {
      expect(css).toContain(`html[data-background="${value}"] body::before`);
      expect(css).toContain(`url("/landing/${image}")`);
      expect(existsSync(`public/landing/${image}`)).toBe(true);
    }
  });
  it("accepts supported values and falls back safely", () => {
    expect(parseThemePreference("night")).toBe("night");
    expect(parseThemePreference("unknown")).toBe("auto");
    expect(parseBackgroundPreference("blue-gray")).toBe("blue-gray");
    expect(parseBackgroundPreference("image-prism-cloud")).toBe("image-prism-cloud");
    expect(parseBackgroundPreference("image-maintenance")).toBe("image-maintenance");
    expect(parseBackgroundPreference("image-industrial-campus")).toBe("image-industrial-campus");
    expect(parseBackgroundPreference("unknown")).toBe("image-maintenance");
    expect(parseLanguagePreference("en")).toBe("th");
  });

  it("bounds background blur and brightness values", () => {
    expect(parseBackgroundBlur(undefined)).toBe(0);
    expect(parseBackgroundBlur("2")).toBe(2);
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
