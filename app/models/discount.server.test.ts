import { describe, expect, it } from "vitest";
import { appDiscountTitle, isOfferDiscountTitle } from "./discount.server";

const offer = {
  id: "offer123",
  title: "Buy more save more",
  status: "active",
  productIds: ["gid://shopify/Product/1"],
  tiers: [
    { minQty: 2, discountType: "percentage" as const, discountValue: 10 },
    { minQty: 3, discountType: "percentage" as const, discountValue: 15 },
  ],
};

describe("appDiscountTitle", () => {
  it("uses a stable BundleStack offer marker", () => {
    expect(appDiscountTitle(offer)).toBe(
      "BundleStack offer123 · Buy more save more",
    );
  });
});

describe("isOfferDiscountTitle", () => {
  it("matches App Function discount titles", () => {
    expect(
      isOfferDiscountTitle("BundleStack offer123 · Buy more save more", offer),
    ).toBe(true);
  });

  it("matches legacy Buy N Basic titles", () => {
    expect(
      isOfferDiscountTitle(
        "Buy 3+, save 15% · Buy more save more",
        offer,
      ),
    ).toBe(true);
  });

  it("matches legacy buy-more titles", () => {
    expect(
      isOfferDiscountTitle(
        "Buy more, save more · Buy 2+ (10% off)",
        offer,
      ),
    ).toBe(true);
  });

  it("ignores unrelated discounts", () => {
    expect(isOfferDiscountTitle("Summer sale 20% off", offer)).toBe(false);
  });

  it("does not match bare offer title prefixes", () => {
    const saleOffer = { ...offer, title: "Sale" };
    expect(isOfferDiscountTitle("Sale 20% off everything", saleOffer)).toBe(
      false,
    );
    expect(isOfferDiscountTitle("Sale · storewide", saleOffer)).toBe(false);
  });
});
