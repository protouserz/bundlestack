import { describe, expect, it } from "vitest";
import {
  getTierForShopifyPlan,
  SHOPIFY_BILLING_PLANS,
} from "./billing.shopify";

describe("getTierForShopifyPlan", () => {
  it("maps exact Shopify billing plan names", () => {
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.STARTER)).toBe("starter");
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.SCALE)).toBe("scale");
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.PRO)).toBe("pro");
  });

  it("maps managed pricing style short names", () => {
    expect(getTierForShopifyPlan("Starter")).toBe("starter");
    expect(getTierForShopifyPlan("Growth")).toBe("scale");
    expect(getTierForShopifyPlan("Pro")).toBe("pro");
  });
});
