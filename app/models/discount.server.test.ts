import { describe, expect, it } from "vitest";
import { isOfferDiscountTitle } from "./discount.server";

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

describe("isOfferDiscountTitle", () => {
  const plannedTitles = new Set([
    "BundleStack offer123 · 1 · Qty 2+ · 10% off",
    "BundleStack offer123 · 2 · Qty 3+ · 15% off",
  ]);

  it("matches BundleStack titles for the offer", () => {
    expect(
      isOfferDiscountTitle(
        "BundleStack offer123 · Qty 2+ · 10% off",
        offer,
        plannedTitles,
      ),
    ).toBe(true);
  });

  it("matches legacy buy-more titles", () => {
    expect(
      isOfferDiscountTitle(
        "Buy more, save more · Buy 2+ (10% off)",
        offer,
        plannedTitles,
      ),
    ).toBe(true);
  });

  it("matches titles based on the offer name", () => {
    expect(
      isOfferDiscountTitle("Buy more save more · tier 2", offer, plannedTitles),
    ).toBe(true);
  });

  it("ignores unrelated discounts", () => {
    expect(
      isOfferDiscountTitle("Summer sale 20% off", offer, plannedTitles),
    ).toBe(false);
  });
});
