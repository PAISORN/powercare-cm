import { describe, expect, it } from "vitest";
import { isDuplicateUsernameError } from "./user-prisma-errors";

describe("user prisma errors", () => {
  it("detects duplicate username errors from Prisma", () => {
    expect(isDuplicateUsernameError({ code: "P2002", meta: { target: ["username"] } })).toBe(true);
    expect(isDuplicateUsernameError({ code: "P2002", meta: { target: "username" } })).toBe(true);
  });

  it("ignores other Prisma unique constraint errors", () => {
    expect(isDuplicateUsernameError({ code: "P2002", meta: { target: ["email"] } })).toBe(false);
    expect(isDuplicateUsernameError({ code: "P2003", meta: { target: ["username"] } })).toBe(false);
  });
});
