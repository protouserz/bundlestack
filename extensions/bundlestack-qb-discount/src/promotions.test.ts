import { describe, expect, it } from "vitest";
import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
} from "../generated/api";
import { cartLinesDiscountsGenerateRun } from "./cart_lines_discounts_generate_run";

function input(jsonValue: Record<string, unknown>, quantity = 3) {
  return {
    cart: {
      lines: [
        {
          id: "gid://shopify/CartLine/0",
          quantity,
          cost: { amountPerQuantity: { amount: "10.0" } },
          merchandise: {
            __typename: "ProductVariant" as const,
            id: "gid://shopify/ProductVariant/1",
            product: { id: "gid://shopify/Product/1" },
          },
        },
        {
          id: "gid://shopify/CartLine/1",
          quantity: 1,
          cost: { amountPerQuantity: { amount: "5.0" } },
          merchandise: {
            __typename: "ProductVariant" as const,
            id: "gid://shopify/ProductVariant/2",
            product: { id: "gid://shopify/Product/2" },
          },
        },
      ],
    },
    discount: {
      discountClasses: [DiscountClass.Product],
      metafield: { jsonValue },
    },
  };
}

describe("promotion discounts", () => {
  it("applies mix & match when the cart hits min items", () => {
    const result = cartLinesDiscountsGenerateRun(
      input({
        type: "mix_match",
        minItems: 3,
        discountType: "percentage",
        discountValue: 15,
        productIds: ["gid://shopify/Product/1"],
      }),
    );

    expect(result.operations[0]?.productDiscountsAdd?.candidates[0]).toMatchObject({
      message: "Mix & match 15% off",
      value: { percentage: { value: 15 } },
    });
    expect(
      result.operations[0]?.productDiscountsAdd?.selectionStrategy,
    ).toBe(ProductDiscountSelectionStrategy.First);
  });

  it("makes an in-cart gift free after the spend threshold", () => {
    const result = cartLinesDiscountsGenerateRun(
      input(
        {
          type: "free_gift",
          minSubtotal: 20,
          giftProductIds: ["gid://shopify/Product/2"],
          giftQuantity: 1,
          productIds: ["gid://shopify/Product/1"],
        },
        3,
      ),
    );

    const candidate =
      result.operations[0]?.productDiscountsAdd?.candidates[0];
    expect(candidate?.message).toBe("Free gift");
    expect(candidate?.targets).toEqual([
      { cartLine: { id: "gid://shopify/CartLine/1", quantity: 1 } },
    ]);
    expect(candidate?.value).toMatchObject({
      fixedAmount: { amount: "5.00", appliesToEachItem: true },
    });
  });
});
