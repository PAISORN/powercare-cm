import { describe, expect, it } from "vitest";
import { assertDevelopmentDatabase } from "./check-development-database";

describe("development database safety", () => {
  it("rejects the production Supabase project", () => {
    expect(() =>
      assertDevelopmentDatabase({
        databaseUrl: "postgresql://user:pass@db.prodref.supabase.co/postgres",
        productionProjectRef: "prodref",
      }),
    ).toThrow("Development database points to production Supabase");
  });

  it("accepts a distinct development Supabase project", () => {
    expect(() =>
      assertDevelopmentDatabase({
        databaseUrl: "postgresql://user:pass@db.devref.supabase.co/postgres",
        productionProjectRef: "prodref",
      }),
    ).not.toThrow();
  });

  it("requires both database URL and production project reference", () => {
    expect(() => assertDevelopmentDatabase({ databaseUrl: undefined, productionProjectRef: "prodref" })).toThrow("DATABASE_URL is required");
    expect(() => assertDevelopmentDatabase({ databaseUrl: "postgresql://user:pass@db.devref.supabase.co/postgres", productionProjectRef: undefined })).toThrow(
      "PRODUCTION_SUPABASE_PROJECT_REF is required",
    );
  });
});
