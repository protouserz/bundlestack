import { describe, expect, it } from "vitest";
import { parseOfferForm } from "./bundle.server";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

const validProductId = "gid://shopify/Product/123456789";
const validTiers = JSON.stringify([
  { minQty: 2, discountType: "percentage", discountValue: 10 },
]);

describe("parseOfferForm", () => {
  it("parses a valid offer form", () => {
    const result = parseOfferForm(
      form({
        title: "Buy more save more",
        status: "active",
        productIds: validProductId,
        tiers: validTiers,
      }),
    );

    expect(result.title).toBe("Buy more save more");
    expect(result.status).toBe("active");
    expect(result.productIds).toEqual([validProductId]);
    expect(result.tiers).toHaveLength(1);
  });

  it("rejects missing title", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "",
          productIds: validProductId,
          tiers: validTiers,
        }),
      ),
    ).toThrow(Response);
  });

  it("rejects invalid product IDs", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "Test",
          productIds: "not-a-gid",
          tiers: validTiers,
        }),
      ),
    ).toThrow(Response);
  });

  it("rejects invalid tier JSON", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "Test",
          productIds: validProductId,
          tiers: "{bad",
        }),
      ),
    ).toThrow(Response);
  });
});
