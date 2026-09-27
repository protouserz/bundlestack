import { describe, expect, it } from "vitest";
import {
  getTierForPlanHandle,
  getTierForShopifyPlan,
  SHOPIFY_BILLING_PLANS,
} from "./billing.shopify";

describe("getTierForPlanHandle", () => {
  it("maps Shopify App Pricing handles to free or Support", () => {
    expect(getTierForPlanHandle("growth")).toBe("starter");
    expect(getTierForPlanHandle("starter")).toBe("starter");
    expect(getTierForPlanHandle("support")).toBe("starter");
    expect(getTierForPlanHandle("pro")).toBe("starter");
    expect(getTierForPlanHandle("free")).toBe("free");
  });
});

describe("getTierForShopifyPlan", () => {
  it("maps current and legacy Shopify billing plan names to Support", () => {
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.SUPPORT)).toBe("starter");
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.STARTER)).toBe("starter");
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.SCALE)).toBe("starter");
    expect(getTierForShopifyPlan(SHOPIFY_BILLING_PLANS.PRO)).toBe("starter");
  });

  it("maps managed pricing style short names exactly", () => {
    expect(getTierForShopifyPlan("Support")).toBe("starter");
    expect(getTierForShopifyPlan("Starter")).toBe("starter");
    expect(getTierForShopifyPlan("Growth")).toBe("starter");
    expect(getTierForShopifyPlan("Pro")).toBe("starter");
  });

  it("does not substring-match unrelated plan names", () => {
    expect(getTierForShopifyPlan("Summer Promo")).toBeNull();
    expect(getTierForShopifyPlan("Professional Services")).toBeNull();
    expect(getTierForShopifyPlan("Growth Spurt Add-on")).toBeNull();
  });
});
