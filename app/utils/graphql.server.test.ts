import { describe, expect, it } from "vitest";
import {
  chunkArray,
  discountNodeIdsMatch,
  discountNodeNumericId,
  normalizeDiscountNodeId,
} from "./graphql.server";

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

describe("discount node id helpers", () => {
  it("normalizes automatic discount node ids to discount node ids", () => {
    expect(
      normalizeDiscountNodeId("gid://shopify/DiscountAutomaticNode/123"),
    ).toBe("gid://shopify/DiscountNode/123");
  });

  it("matches ids with different shopify node type prefixes", () => {
    expect(
      discountNodeIdsMatch(
        "gid://shopify/DiscountAutomaticNode/123",
        "gid://shopify/DiscountNode/123",
      ),
    ).toBe(true);
  });

  it("extracts the numeric suffix from a gid", () => {
    expect(discountNodeNumericId("gid://shopify/DiscountNode/456")).toBe("456");
  });
});
