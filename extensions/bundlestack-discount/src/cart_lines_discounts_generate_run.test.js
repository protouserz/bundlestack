import { describe, expect, it } from "vitest";
import { cartLinesDiscountsGenerateRun } from "./cart_lines_discounts_generate_run.js";

describe("cartLinesDiscountsGenerateRun BOGO", () => {
  it("discounts get quantity on cheapest units", () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 2,
            cost: { amountPerQuantity: { amount: "20.0" } },
            merchandise: {
              __typename: "ProductVariant",
              id: "gid://shopify/ProductVariant/1",
              product: { id: "gid://shopify/Product/1" },
            },
          },
        ],
      },
      discount: {
        discountClasses: ["PRODUCT"],
        metafield: {
          value: JSON.stringify({
            type: "bogo",
            buyQuantity: 1,
            getQuantity: 1,
            getDiscountType: "free",
            getDiscountValue: 100,
            sameProduct: true,
            productIds: ["gid://shopify/Product/1"],
          }),
        },
      },
    });

    expect(result.operations).toHaveLength(1);
    const candidate =
      result.operations[0].productDiscountsAdd.candidates[0];
    expect(candidate.targets[0].cartLine.quantity).toBe(1);
    expect(candidate.value.percentage.value).toBe("100");
  });

  it("returns no operations without enough quantity", () => {
    const result = cartLinesDiscountsGenerateRun({
      cart: {
        lines: [
          {
            id: "gid://shopify/CartLine/1",
            quantity: 1,
            cost: { amountPerQuantity: { amount: "20.0" } },
            merchandise: {
              __typename: "ProductVariant",
              product: { id: "gid://shopify/Product/1" },
            },
          },
        ],
      },
      discount: {
        discountClasses: ["PRODUCT"],
        metafield: {
          value: JSON.stringify({
            type: "bogo",
            buyQuantity: 1,
            getQuantity: 1,
            getDiscountType: "free",
            productIds: ["gid://shopify/Product/1"],
          }),
        },
      },
    });

    expect(result.operations).toEqual([]);
  });
});
