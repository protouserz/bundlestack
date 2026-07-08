import { describe, expect, it } from "vitest";
import { safeJsonParse } from "./json.server";

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    expect(safeJsonParse('["a","b"]', [])).toEqual(["a", "b"]);
  });

  it("returns fallback for invalid JSON", () => {
    expect(safeJsonParse("{not json", ["fallback"])).toEqual(["fallback"]);
  });

  it("returns fallback for empty string", () => {
    expect(safeJsonParse("", { ok: false })).toEqual({ ok: false });
  });
});
