import { describe, expect, it } from "vitest";
import { chunkArray } from "./graphql.server";

describe("chunkArray", () => {
  it("splits items into fixed-size chunks", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns empty array for empty input", () => {
    expect(chunkArray([], 10)).toEqual([]);
  });

  it("returns single chunk when size exceeds length", () => {
    expect(chunkArray(["a", "b"], 5)).toEqual([["a", "b"]]);
  });
});
