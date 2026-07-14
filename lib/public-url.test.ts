import { describe, expect, it } from "vitest";
import { getGeneralRequestUrl, getPlantRequestUrl, getPublicBaseUrl } from "./public-url";

describe("public URL helpers", () => {
  it("uses forwarded host and protocol for production URLs", () => {
    expect(
      getGeneralRequestUrl({
        forwardedHost: "powercare-cm.vercel.app",
        forwardedProto: "https",
      }),
    ).toBe("https://powercare-cm.vercel.app/request");
  });

  it("keeps local development URLs on http", () => {
    expect(getPublicBaseUrl({ host: "localhost:3000" })).toBe("http://localhost:3000");
  });

  it("prefers the request origin when available", () => {
    expect(getGeneralRequestUrl({ origin: "https://example.com" })).toBe("https://example.com/request");
  });

  it("builds plant-specific repair request URLs for QR codes", () => {
    expect(getPlantRequestUrl({ origin: "https://example.com" }, "main")).toBe("https://example.com/p/main/request");
  });
});
