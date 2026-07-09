import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  planIncludesPromotionType,
  assertPromotionPlanAccess,
  assertAnyPromotionPlanAccess,
} from "./promotion-access.server";
import { applyPromotionDiscountSync } from "./promotion-sync.server";
import { parsePromotionForm } from "./promotion.server";
import {
  defaultConfigForType,
  summarizePromotionConfig,
  PROMOTION_TYPES,
  type PromotionRecord,
  type PromotionType,
} from "./promotion.types";
import {
  promotionTypeFromSlug,
  promotionSlugFromType,
  promotionListPath,
  promotionNewPath,
  promotionEditPath,
} from "./promotion-routes";
import {
  planIncludesCorePromotions,
  planIncludesAdvancedPromotions,
  planIncludesCoupons,
} from "../billing.server";
import { parseCouponForm } from "./coupon.server";

vi.mock("./discount.server", () => ({
  deleteShopifyDiscounts: vi.fn(async () => undefined),
}));

vi.mock("./bundle.server", () => ({
  getShopSettings: vi.fn(async () => ({ billingPlan: "free" })),
}));

import { deleteShopifyDiscounts } from "./discount.server";
import { getShopSettings } from "./bundle.server";

const PRODUCT_A = "gid://shopify/Product/1001";
const PRODUCT_B = "gid://shopify/Product/1002";
const PRODUCT_C = "gid://shopify/Product/1003";

function formFor(
  type: PromotionType,
  overrides: Record<string, string> = {},
): FormData {
  const formData = new FormData();
  formData.set("title", `E2E ${type}`);
  formData.set("status", "active");
  formData.set("config", JSON.stringify(defaultConfigForType(type)));
  formData.set("productIds", PRODUCT_A);
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

function promotionFromForm(
  type: PromotionType,
  overrides: Record<string, string> = {},
): PromotionRecord {
  const input = parsePromotionForm(formFor(type, overrides), type);
  return {
    id: `promo-${type}`,
    shop: "bundlestack-dev.myshopify.com",
    title: input.title,
    promotionType: type,
    status: input.status ?? "active",
    config: input.config!,
    productIds: input.productIds ?? [],
    collectionIds: input.collectionIds ?? [],
    discountIds: [],
    discountUses: 0,
    revenueGenerated: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mockAdmin(discountId = "gid://shopify/DiscountAutomaticNode/99") {
  return {
    graphql: vi.fn(async () => ({
      json: async () => ({
        data: {
          discountAutomaticAppCreate: {
            automaticAppDiscount: { discountId },
            userErrors: [],
          },
        },
      }),
    })),
  };
}

describe("plan gating matrix", () => {
  it("gates coupons and core promotions to Starter+", () => {
    for (const plan of ["free", "starter", "scale", "pro"] as const) {
      const paid = plan !== "free";
      expect(planIncludesCoupons(plan)).toBe(paid);
      expect(planIncludesCorePromotions(plan)).toBe(paid);
    }
  });

  it("gates builders and FBT to Growth+", () => {
    expect(planIncludesAdvancedPromotions("free")).toBe(false);
    expect(planIncludesAdvancedPromotions("starter")).toBe(false);
    expect(planIncludesAdvancedPromotions("scale")).toBe(true);
    expect(planIncludesAdvancedPromotions("pro")).toBe(true);
  });

  it("maps each promotion type to the right plan tier", () => {
    expect(planIncludesPromotionType("free", "bogo")).toBe(false);
    expect(planIncludesPromotionType("starter", "bogo")).toBe(true);
    expect(planIncludesPromotionType("starter", "free_gift")).toBe(true);
    expect(planIncludesPromotionType("starter", "mix_match")).toBe(true);
    expect(planIncludesPromotionType("starter", "bundle_builder")).toBe(false);
    expect(planIncludesPromotionType("starter", "fbt")).toBe(false);
    expect(planIncludesPromotionType("scale", "bundle_builder")).toBe(true);
    expect(planIncludesPromotionType("scale", "fbt")).toBe(true);
  });

  it("assertPromotionPlanAccess uses stored shop plan", async () => {
    vi.mocked(getShopSettings).mockResolvedValueOnce({
      billingPlan: "starter",
    } as never);

    await expect(
      assertPromotionPlanAccess("shop.myshopify.com", "bogo"),
    ).resolves.toMatchObject({ allowed: true, plan: "starter" });

    vi.mocked(getShopSettings).mockResolvedValueOnce({
      billingPlan: "starter",
    } as never);

    await expect(
      assertPromotionPlanAccess("shop.myshopify.com", "fbt"),
    ).resolves.toMatchObject({ allowed: false, plan: "starter" });
  });

  it("assertAnyPromotionPlanAccess reports core vs advanced", async () => {
    vi.mocked(getShopSettings).mockResolvedValueOnce({
      billingPlan: "scale",
    } as never);

    await expect(
      assertAnyPromotionPlanAccess("shop.myshopify.com"),
    ).resolves.toMatchObject({
      allowed: true,
      coreAllowed: true,
      advancedAllowed: true,
      plan: "scale",
    });
  });
});

describe("promotion routes for each feature", () => {
  it("round-trips slugs for every promotion type", () => {
    for (const type of PROMOTION_TYPES) {
      const slug = promotionSlugFromType(type);
      expect(promotionTypeFromSlug(slug)).toBe(type);
      expect(promotionListPath(type)).toBe(`/app/promotions/${slug}`);
      expect(promotionNewPath(type)).toBe(`/app/promotions/${slug}/new`);
      expect(promotionEditPath(type, "abc")).toBe(
        `/app/promotions/${slug}/abc`,
      );
    }
  });

  it("rejects unknown slugs", () => {
    expect(promotionTypeFromSlug("nope")).toBeNull();
    expect(promotionTypeFromSlug(undefined)).toBeNull();
  });
});

describe("form → config e2e for each promotion type", () => {
  it("parses BOGO with get products when sameProduct is false", () => {
    const formData = formFor("bogo", {
      config: JSON.stringify({
        ...defaultConfigForType("bogo"),
        sameProduct: false,
      }),
      productIds: `${PRODUCT_A}\n${PRODUCT_B}`,
      getProductIds: PRODUCT_C,
    });

    const parsed = parsePromotionForm(formData, "bogo");
    expect(parsed.productIds).toEqual([PRODUCT_A, PRODUCT_B]);
    expect(parsed.config).toMatchObject({
      sameProduct: false,
      getProductIds: [PRODUCT_C],
    });
    expect(summarizePromotionConfig("bogo", parsed.config!)).toContain("Buy 1");
  });

  it("parses free gift with gift product IDs", () => {
    const formData = formFor("free_gift", {
      giftProductIds: `${PRODUCT_B}\n${PRODUCT_C}`,
      productIds: "",
    });

    const parsed = parsePromotionForm(formData, "free_gift");
    expect(parsed.productIds).toEqual([]);
    expect(parsed.config).toMatchObject({
      giftProductIds: [PRODUCT_B, PRODUCT_C],
      minSubtotal: 50,
    });
  });

  it("parses mix & match product set", () => {
    const formData = formFor("mix_match", {
      productIds: `${PRODUCT_A},${PRODUCT_B},${PRODUCT_C}`,
      config: JSON.stringify({
        minItems: 3,
        discountType: "percentage",
        discountValue: 20,
        allowCollections: true,
      }),
    });

    const parsed = parsePromotionForm(formData, "mix_match");
    expect(parsed.productIds).toHaveLength(3);
    expect(summarizePromotionConfig("mix_match", parsed.config!)).toBe(
      "Any 3+ · 20% off",
    );
  });

  it("parses bundle builder defaults", () => {
    const parsed = parsePromotionForm(formFor("bundle_builder"), "bundle_builder");
    expect(parsed.config).toMatchObject({
      discountValue: 10,
      minStepsCompleted: 2,
    });
    expect((parsed.config as { steps: unknown[] }).steps).toHaveLength(2);
  });

  it("parses FBT anchors and recommended products", () => {
    const formData = formFor("fbt", {
      productIds: PRODUCT_A,
      recommendedProductIds: `${PRODUCT_B}\n${PRODUCT_C}`,
    });

    const parsed = parsePromotionForm(formData, "fbt");
    expect(parsed.productIds).toEqual([PRODUCT_A]);
    expect(parsed.config).toMatchObject({
      anchorProductIds: [PRODUCT_A],
      recommendedProductIds: [PRODUCT_B, PRODUCT_C],
    });
  });

  it("rejects invalid product GIDs", async () => {
    const formData = formFor("bogo", {
      productIds: "not-a-gid",
    });
    try {
      parsePromotionForm(formData, "bogo");
      expect.unreachable("expected invalid product ID to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect(await (error as Response).text()).toMatch(/Invalid product ID/);
    }
  });
});

describe("coupon form e2e", () => {
  it("normalizes code and percentage coupon", () => {
    const formData = new FormData();
    formData.set("title", "Welcome");
    formData.set("code", "save10");
    formData.set("status", "active");
    formData.set("discountType", "percentage");
    formData.set("discountValue", "10");
    formData.set("appliesOncePerCustomer", "true");

    expect(parseCouponForm(formData)).toMatchObject({
      code: "SAVE10",
      discountType: "percentage",
      discountValue: 10,
    });
  });
});

describe("promotion discount sync e2e", () => {
  beforeEach(() => {
    vi.mocked(deleteShopifyDiscounts).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a Function discount for active BOGO", async () => {
    const admin = mockAdmin();
    const promotion = promotionFromForm("bogo");

    const ids = await applyPromotionDiscountSync(admin as never, promotion, []);

    expect(ids).toEqual(["gid://shopify/DiscountAutomaticNode/99"]);
    expect(admin.graphql).toHaveBeenCalledOnce();
    const variables = admin.graphql.mock.calls[0][1].variables
      .automaticAppDiscount;
    expect(variables.functionHandle).toBe("bundlestack-discount");
    expect(variables.discountClasses).toEqual(["PRODUCT"]);
    expect(JSON.parse(variables.metafields[0].value)).toMatchObject({
      type: "bogo",
      productIds: [PRODUCT_A],
      buyQuantity: 1,
      getQuantity: 1,
    });
  });

  it("clears existing discounts and skips create when paused", async () => {
    const admin = mockAdmin();
    const promotion = {
      ...promotionFromForm("bogo"),
      status: "paused",
    };

    const ids = await applyPromotionDiscountSync(admin as never, promotion, [
      "gid://shopify/DiscountAutomaticNode/1",
    ]);

    expect(ids).toEqual([]);
    expect(deleteShopifyDiscounts).toHaveBeenCalledWith(admin, [
      "gid://shopify/DiscountAutomaticNode/1",
    ]);
    expect(admin.graphql).not.toHaveBeenCalled();
  });

  it("rejects active BOGO without products", async () => {
    const admin = mockAdmin();
    const promotion = {
      ...promotionFromForm("bogo"),
      productIds: [],
    };

    await expect(
      applyPromotionDiscountSync(admin as never, promotion, []),
    ).rejects.toThrow(/at least one product/i);
  });

  it("does not create Shopify discounts for non-BOGO types yet", async () => {
    const admin = mockAdmin();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    for (const type of [
      "free_gift",
      "mix_match",
      "bundle_builder",
      "fbt",
    ] as const) {
      const ids = await applyPromotionDiscountSync(
        admin as never,
        promotionFromForm(type),
        [],
      );
      expect(ids).toEqual([]);
    }

    expect(admin.graphql).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });

  it("surfaces Shopify userErrors from discountAutomaticAppCreate", async () => {
    const admin = {
      graphql: vi.fn(async () => ({
        json: async () => ({
          data: {
            discountAutomaticAppCreate: {
              automaticAppDiscount: null,
              userErrors: [{ message: "Function not found" }],
            },
          },
        }),
      })),
    };

    await expect(
      applyPromotionDiscountSync(
        admin as never,
        promotionFromForm("bogo"),
        [],
      ),
    ).rejects.toThrow(/Function not found/);
  });
});
