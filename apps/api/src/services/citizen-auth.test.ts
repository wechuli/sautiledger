import { describe, expect, it } from "vitest";
import { normalizeKenyanPhone, AuthError } from "./citizen-auth.js";

describe("normalizeKenyanPhone", () => {
  it.each([
    ["+254712345678", "+254712345678"],
    ["254712345678", "+254712345678"],
    ["0712345678", "+254712345678"],
    ["712345678", "+254712345678"],
    ["+254 712 345 678", "+254712345678"],
    ["0112345678", "+254112345678"]
  ])("normalizes %s -> %s", (input, expected) => {
    expect(normalizeKenyanPhone(input)).toBe(expected);
  });

  it.each(["12345", "+1 555 555 5555", "0612345678", "07123456789", "abcd"])(
    "rejects invalid %s",
    (bad) => {
      expect(() => normalizeKenyanPhone(bad)).toThrow(AuthError);
    }
  );
});
