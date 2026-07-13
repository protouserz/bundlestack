import { describe, expect, it } from "vitest";
import { cartLinesDiscountsGenerateRun } from "./cart_lines_discounts_generate_run.js";

function line({ id, quantity, amount, productId }) {
  return {
    id,
    quantity,
    cost: { amountPerQuantity: { amount } },
    merchandise: {
      __typename: "ProductVariant",
      id: `${id}-variant`,
      product: { id: productId },
    },
  };
}

function run(config, lines, classes = ["PRODUCT"]) {
  return cartLinesDiscountsGenerateRun({
    cart: { lines },
    discount: {
      discountClasses: classes,
      metafield: { value: JSON.stringify(config) },
    },
  });
}

const PRODUCT = "gid://shopify/Product/1";
const OTHER = "gid://shopify/Product/2";
const GIFT = "gid://shopify/Product/3";
const ADDON = "gid://shopify/Product/4";

describe("BOGO discount function e2e scenarios", () => {
  it("buy 1 get 1 free on same product", () => {
    const result = run(
      {
        type: "bogo",
        buyQuantity: 1,
        getQuantity: 1,
        getDiscountType: "free",
        getDiscountValue: 100,
        sameProduct: true,
        productIds: [PRODUCT],
      },
      [line({ id: "line-1", quantity: 2, amount: "25.0", productId: PRODUCT })],
    );

    const candidate = result.operations[0].productDiscountsAdd.candidates[0];
    expect(candidate.targets[0].cartLine.quantity).toBe(1);
    expect(candidate.value.percentage.value).toBe("100");
    expect(candidate.message).toMatch(/Free/i);
  });

  it("buy 2 get 1 at 50% off", () => {
    const result = run(
      {
        type: "bogo",
        buyQuantity: 2,
        getQuantity: 1,
        getDiscountType: "percentage",
        getDiscountValue: 50,
        sameProduct: true,
        productIds: [PRODUCT],
      },
      [line({ id: "line-1", quantity: 3, amount: "10.0", productId: PRODUCT })],
    );

    const candidate = result.operations[0].productDiscountsAdd.candidates[0];
    expect(candidate.targets[0].cartLine.quantity).toBe(1);
    expect(candidate.value.percentage.value).toBe("50");
  });

  it("applies fixed amount get discount", () => {
    const result = run(
      {
        type: "bogo",
        buyQuantity: 1,
        getQuantity: 1,
        getDiscountType: "fixed",
        getDiscountValue: 5,
        sameProduct: true,
        productIds: [PRODUCT],
      },
      [line({ id: "line-1", quantity: 2, amount: "20.0", productId: PRODUCT })],
    );

    const candidate = result.operations[0].productDiscountsAdd.candidates[0];
    expect(candidate.value.fixedAmount.amount).toBe("5");
  });

  it("discounts cheapest units across multiple lines", () => {
    const result = run(
      {
        type: "bogo",
        buyQuantity: 1,
        getQuantity: 1,
        getDiscountType: "free",
        getDiscountValue: 100,
        sameProduct: true,
        productIds: [PRODUCT],
      },
      [
        line({
          id: "expensive",
          quantity: 1,
          amount: "40.0",
          productId: PRODUCT,
        }),
        line({ id: "cheap", quantity: 1, amount: "10.0", productId: PRODUCT }),
      ],
    );

    const targets = result.operations[0].productDiscountsAdd.candidates[0].targets;
    expect(targets).toEqual([{ cartLine: { id: "cheap", quantity: 1 } }]);
  });

  it("ignores ineligible products", () => {
    const result = run(
      {
        type: "bogo",
        buyQuantity: 1,
        getQuantity: 1,
        getDiscountType: "free",
        productIds: [PRODUCT],
      },
      [line({ id: "line-1", quantity: 4, amount: "10.0", productId: OTHER })],
    );

    expect(result.operations).toEqual([]);
  });

  it("returns no ops without PRODUCT discount class", () => {
    const result = run(
      {
        type: "bogo",
        buyQuantity: 1,
        getQuantity: 1,
        getDiscountType: "free",
        productIds: [PRODUCT],
      },
      [line({ id: "line-1", quantity: 2, amount: "10.0", productId: PRODUCT })],
      ["ORDER"],
    );

    expect(result.operations).toEqual([]);
  });

  it("supports different get products when sameProduct is false", () => {
    const result = run(
      {
        type: "bogo",
        buyQuantity: 1,
        getQuantity: 1,
        getDiscountType: "free",
        getDiscountValue: 100,
        sameProduct: false,
        productIds: [PRODUCT],
        getProductIds: [OTHER],
      },
      [
        line({ id: "buy", quantity: 1, amount: "10.0", productId: PRODUCT }),
        line({ id: "get", quantity: 1, amount: "50.0", productId: OTHER }),
      ],
    );

    const targets =
      result.operations[0].productDiscountsAdd.candidates[0].targets;
    expect(targets).toEqual([{ cartLine: { id: "get", quantity: 1 } }]);
  });

  it("does not discount get items without enough buy items", () => {
    const result = run(
      {
        type: "bogo",
        buyQuantity: 2,
        getQuantity: 1,
        getDiscountType: "free",
        sameProduct: false,
        productIds: [PRODUCT],
        getProductIds: [OTHER],
      },
      [
        line({ id: "buy", quantity: 1, amount: "10.0", productId: PRODUCT }),
        line({ id: "get", quantity: 2, amount: "50.0", productId: OTHER }),
      ],
    );

    expect(result.operations).toEqual([]);
  });
});

describe("free gift discount function", () => {
  it("gifts free when min subtotal met and gift is in cart", () => {
    const result = run(
      {
        type: "free_gift",
        minSubtotal: 40,
        giftProductIds: [GIFT],
        giftQuantity: 1,
        productIds: [PRODUCT],
      },
      [
        line({ id: "buy", quantity: 2, amount: "25.0", productId: PRODUCT }),
        line({ id: "gift", quantity: 1, amount: "15.0", productId: GIFT }),
      ],
    );

    const candidate = result.operations[0].productDiscountsAdd.candidates[0];
    expect(candidate.targets).toEqual([
      { cartLine: { id: "gift", quantity: 1 } },
    ]);
    expect(candidate.value.percentage.value).toBe("100");
  });

  it("requires gift in cart", () => {
    const result = run(
      {
        type: "free_gift",
        minSubtotal: 10,
        giftProductIds: [GIFT],
        giftQuantity: 1,
        productIds: [PRODUCT],
      },
      [line({ id: "buy", quantity: 2, amount: "25.0", productId: PRODUCT })],
    );
    expect(result.operations).toEqual([]);
  });
});

describe("mix & match discount function", () => {
  it("discounts eligible lines when min items met", () => {
    const result = run(
      {
        type: "mix_match",
        minItems: 3,
        discountType: "percentage",
        discountValue: 15,
        productIds: [PRODUCT, OTHER],
      },
      [
        line({ id: "a", quantity: 2, amount: "10.0", productId: PRODUCT }),
        line({ id: "b", quantity: 1, amount: "12.0", productId: OTHER }),
      ],
    );

    const candidate = result.operations[0].productDiscountsAdd.candidates[0];
    expect(candidate.value.percentage.value).toBe("15");
    expect(candidate.targets).toHaveLength(2);
  });

  it("skips when under min items", () => {
    const result = run(
      {
        type: "mix_match",
        minItems: 3,
        discountType: "percentage",
        discountValue: 15,
        productIds: [PRODUCT],
      },
      [line({ id: "a", quantity: 2, amount: "10.0", productId: PRODUCT })],
    );
    expect(result.operations).toEqual([]);
  });
});

describe("bundle builder discount function", () => {
  it("applies when enough steps completed", () => {
    const result = run(
      {
        type: "bundle_builder",
        minStepsCompleted: 2,
        discountType: "percentage",
        discountValue: 20,
        steps: [
          { productIds: [PRODUCT], minSelect: 1 },
          { productIds: [ADDON], minSelect: 1 },
        ],
      },
      [
        line({ id: "base", quantity: 1, amount: "30.0", productId: PRODUCT }),
        line({ id: "extra", quantity: 1, amount: "10.0", productId: ADDON }),
      ],
    );

    const candidate = result.operations[0].productDiscountsAdd.candidates[0];
    expect(candidate.value.percentage.value).toBe("20");
    expect(candidate.message).toMatch(/Bundle/i);
  });
});

describe("FBT discount function", () => {
  it("discounts recommended when anchor present", () => {
    const result = run(
      {
        type: "fbt",
        anchorProductIds: [PRODUCT],
        recommendedProductIds: [OTHER],
        requireAll: true,
        discountType: "percentage",
        discountValue: 10,
      },
      [
        line({ id: "anchor", quantity: 1, amount: "40.0", productId: PRODUCT }),
        line({ id: "rec", quantity: 1, amount: "20.0", productId: OTHER }),
      ],
    );

    const candidate = result.operations[0].productDiscountsAdd.candidates[0];
    expect(candidate.targets).toEqual([
      { cartLine: { id: "rec", quantity: 1 } },
    ]);
    expect(candidate.value.percentage.value).toBe("10");
  });

  it("skips when recommended missing under requireAll", () => {
    const result = run(
      {
        type: "fbt",
        anchorProductIds: [PRODUCT],
        recommendedProductIds: [OTHER, GIFT],
        requireAll: true,
        discountType: "percentage",
        discountValue: 10,
      },
      [
        line({ id: "anchor", quantity: 1, amount: "40.0", productId: PRODUCT }),
        line({ id: "rec", quantity: 1, amount: "20.0", productId: OTHER }),
      ],
    );
    expect(result.operations).toEqual([]);
  });
});
