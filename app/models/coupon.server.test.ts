import { describe, expect, it } from "vitest";
import {
  filterEligibleProductIds,
  parseCouponForm,
} from "./coupon.server";
import { buildCustomerGetsItems } from "./discount-code.server";
import { formatCouponScope, formatCouponValue } from "../utils/coupon";

const productA = "gid://shopify/Product/1";
const productB = "gid://shopify/Product/2";

describe("parseCouponForm", () => {
  it("parses a percentage coupon", () => {
    const formData = new FormData();
    formData.set("title", "Welcome");
    formData.set("code", "save10");
    formData.set("status", "active");
    formData.set("discountType", "percentage");
    formData.set("discountValue", "10");
    formData.set("appliesOncePerCustomer", "true");
    formData.set("appliesTo", "all");

    expect(parseCouponForm(formData)).toMatchObject({
      title: "Welcome",
      code: "SAVE10",
      status: "active",
      discountType: "percentage",
      discountValue: 10,
      appliesOncePerCustomer: true,
      appliesTo: "all",
      productIds: [],
      excludedProductIds: [],
      usageLimit: null,
    });
  });

  it("parses storewide exclusions", () => {
    const formData = new FormData();
    formData.set("title", "Store sale");
    formData.set("code", "ALL20");
    formData.set("discountType", "percentage");
    formData.set("discountValue", "20");
    formData.set("appliesTo", "all");
    formData.set("excludedProductIds", `${productA}\n${productB}`);

    expect(parseCouponForm(formData)).toMatchObject({
      appliesTo: "all",
      productIds: [],
      excludedProductIds: [productA, productB],
    });
  });

  it("parses specific product coupons", () => {
    const formData = new FormData();
    formData.set("title", "Snowboard deal");
    formData.set("code", "BOARD10");
    formData.set("discountType", "fixed");
    formData.set("discountValue", "10");
    formData.set("appliesTo", "products");
    formData.set("productIds", productA);
    formData.set("excludedProductIds", productB);

    expect(parseCouponForm(formData)).toMatchObject({
      appliesTo: "products",
      productIds: [productA],
      excludedProductIds: [],
    });
  });

  it("rejects product-scoped coupons without products", () => {
    const formData = new FormData();
    formData.set("title", "Missing products");
    formData.set("code", "NEED");
    formData.set("discountType", "percentage");
    formData.set("discountValue", "10");
    formData.set("appliesTo", "products");

    expect(() => parseCouponForm(formData)).toThrow();
  });

  it("rejects invalid percentage values", () => {
    const formData = new FormData();
    formData.set("title", "Too much");
    formData.set("code", "BIG");
    formData.set("discountType", "percentage");
    formData.set("discountValue", "150");

    expect(() => parseCouponForm(formData)).toThrow();
  });
});

describe("filterEligibleProductIds", () => {
  it("removes excluded products from the catalog list", () => {
    expect(
      filterEligibleProductIds([productA, productB], [productB]),
    ).toEqual([productA]);
  });
});

describe("buildCustomerGetsItems", () => {
  it("targets specific products", () => {
    expect(
      buildCustomerGetsItems({
        appliesTo: "products",
        productIds: [productA],
        excludedProductIds: [],
      }),
    ).toEqual({
      products: { productsToAdd: [productA] },
    });
  });

  it("uses all items for storewide with no exclusions", () => {
    expect(
      buildCustomerGetsItems({
        appliesTo: "all",
        productIds: [],
        excludedProductIds: [],
      }),
    ).toEqual({ all: true });
  });

  it("uses a managed collection when exclusions exist", () => {
    expect(
      buildCustomerGetsItems({
        appliesTo: "all",
        productIds: [],
        excludedProductIds: [productA],
        eligibleCollectionId: "gid://shopify/Collection/9",
      }),
    ).toEqual({
      collections: {
        collectionsToAdd: ["gid://shopify/Collection/9"],
      },
    });
  });

  it("throws when exclusions exist without a collection id", () => {
    expect(() =>
      buildCustomerGetsItems({
        appliesTo: "all",
        productIds: [],
        excludedProductIds: [productA],
      }),
    ).toThrow(/Eligible collection/);
  });
});

describe("formatCouponValue", () => {
  it("formats percentage and fixed values", () => {
    expect(
      formatCouponValue({ discountType: "percentage", discountValue: 15 }),
    ).toBe("15% off");
    expect(
      formatCouponValue({ discountType: "fixed", discountValue: 20 }),
    ).toBe("$20.00 off");
  });
});

describe("formatCouponScope", () => {
  it("describes product and storewide scopes", () => {
    expect(
      formatCouponScope({
        appliesTo: "products",
        productIds: [productA],
        excludedProductIds: [],
      }),
    ).toBe("1 product");
    expect(
      formatCouponScope({
        appliesTo: "all",
        productIds: [],
        excludedProductIds: [],
      }),
    ).toBe("Entire store");
    expect(
      formatCouponScope({
        appliesTo: "all",
        productIds: [],
        excludedProductIds: [productA, productB],
      }),
    ).toBe("Entire store · 2 excluded");
  });
});
