import { describe, expect, it } from "vitest";
import {
  getTierForPlanHandle,
  getTierForShopifyPlan,
  SHOPIFY_BILLING_PLANS,
} from "./billing.shopify";

describe("getTierForPlanHandle", () => {
  it("maps Shopify App Pricing handles to app tiers", () => {
    expect(getTierForPlanHandle("growth")).toBe("scale");
    expect(getTierForPlanHandle("starter")).toBe("starter");
    expect(getTierForPlanHandle("pro")).toBe("pro");
    expect(getTierForPlanHandle("free")).toBe("free");
  });
});

describe("getTierForShopifyPlan", () => {
  it("maps exact Shopify billing plan names", () => {
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.STARTER)).toBe("starter");
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.SCALE)).toBe("scale");
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.PRO)).toBe("pro");
  });

  it("maps managed pricing style short names exactly", () => {
    expect(getTierForShopifyPlan("Starter")).toBe("starter");
    expect(getTierForShopifyPlan("Growth")).toBe("scale");
    expect(getTierForShopifyPlan("Pro")).toBe("pro");
  });

  it("does not substring-match unrelated plan names", () => {
    expect(getTierForShopifyPlan("Summer Promo")).toBeNull();
    expect(getTierForShopifyPlan("Professional Services")).toBeNull();
    expect(getTierForShopifyPlan("Growth Spurt Add-on")).toBeNull();
  });
});
