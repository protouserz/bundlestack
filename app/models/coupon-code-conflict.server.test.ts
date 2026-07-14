import { describe, expect, it } from "vitest";
import { couponOverwriteFromUniqueError } from "./coupon-code-conflict.server";
import { isShopifyCodeUniqueError } from "./discount-code.server";

describe("isShopifyCodeUniqueError", () => {
  it("matches Shopify unique-code errors", () => {
    expect(
      isShopifyCodeUniqueError(
        "Code must be unique. Please try a different code.",
      ),
    ).toBe(true);
    expect(isShopifyCodeUniqueError("percentage must be between 0 and 1")).toBe(
      false,
    );
  });
});

describe("couponOverwriteFromUniqueError", () => {
  it("builds a replace warning for the given code", () => {
    const result = couponOverwriteFromUniqueError(
      "SAVE10",
      "Code must be unique",
    );
    expect(result.code).toBe("SAVE10");
    expect(result.message).toMatch(/SAVE10/);
    expect(result.message).toMatch(/Replace/i);
  });
});
