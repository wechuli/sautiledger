import { describe, expect, it } from "vitest";
import { createTrackingCode, hashContactIdentifier } from "./privacy.js";

describe("hashContactIdentifier", () => {
  it("returns undefined when contact missing", () => {
    expect(hashContactIdentifier()).toBeUndefined();
    expect(hashContactIdentifier("")).toBeUndefined();
  });

  it("is deterministic and case/space insensitive", () => {
    const a = hashContactIdentifier("+254700000001");
    const b = hashContactIdentifier(" +254700000001 ");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different contacts", () => {
    const a = hashContactIdentifier("+254700000001");
    const b = hashContactIdentifier("+254700000002");
    expect(a).not.toBe(b);
  });
});

describe("createTrackingCode", () => {
  it("generates SL-prefixed uppercase hex codes", () => {
    const code = createTrackingCode();
    expect(code).toMatch(/^SL-[0-9A-F]{8}$/);
  });

  it("is unique across calls", () => {
    const codes = new Set(
      Array.from({ length: 100 }, () => createTrackingCode()),
    );
    expect(codes.size).toBe(100);
  });
});
