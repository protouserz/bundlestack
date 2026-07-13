import { describe, expect, it } from "vitest";
import {
  defaultConfigForType,
  summarizePromotionConfig,
} from "./promotion.types";
import { parsePromotionForm } from "./promotion.server";

describe("defaultConfigForType", () => {
  it("returns sensible BOGO defaults", () => {
    expect(defaultConfigForType("bogo")).toMatchObject({
      buyQuantity: 1,
      getQuantity: 1,
      getDiscountType: "free",
    });
  });
});

describe("summarizePromotionConfig", () => {
  it("summarizes BOGO and mix & match", () => {
    expect(
      summarizePromotionConfig("bogo", defaultConfigForType("bogo")),
    ).toBe("Buy 1, get 1 free");
    expect(
      summarizePromotionConfig("mix_match", defaultConfigForType("mix_match")),
    ).toBe("Any 3+ · 15% off");
  });
});

describe("parsePromotionForm", () => {
  it("parses a free gift form", () => {
    const formData = new FormData();
    formData.set("title", "Gift over 50");
    formData.set("status", "draft");
    formData.set(
      "config",
      JSON.stringify({
        minSubtotal: 50,
        minQuantity: null,
        giftProductIds: [],
        giftQuantity: 1,
        autoAdd: false,
      }),
    );

    expect(parsePromotionForm(formData, "free_gift")).toMatchObject({
      title: "Gift over 50",
      promotionType: "free_gift",
      status: "draft",
    });
  });

  it("parses newline-separated product IDs for BOGO", () => {
    const formData = new FormData();
    formData.set("title", "BOGO tees");
    formData.set("status", "active");
    formData.set(
      "config",
      JSON.stringify(defaultConfigForType("bogo")),
    );
    formData.set(
      "productIds",
      "gid://shopify/Product/1\ngid://shopify/Product/2",
    );

    expect(parsePromotionForm(formData, "bogo")).toMatchObject({
      title: "BOGO tees",
      productIds: [
        "gid://shopify/Product/1",
        "gid://shopify/Product/2",
      ],
    });
  });
});
