import { describe, expect, it } from "vitest";
import { SHOPIFY_BILLING_PLANS } from "../billing.shopify";
import {
  resolveBillingPlan,
  resolveCurrentBillingPlan,
  resolvePendingBillingPlan,
} from "./bundle.server";

describe("resolveBillingPlan", () => {
  it("returns free when there is no active subscription", () => {
    expect(resolveBillingPlan([])).toBe("free");
    expect(resolveBillingPlan(["Some other app plan"])).toBe("free");
  });

  it("maps active Shopify subscription names to app tiers", () => {
    expect(resolveBillingPlan([SHOPIFY_BILLING_PLANS.STARTER])).toBe("starter");
    expect(resolveBillingPlan([SHOPIFY_BILLING_PLANS.SCALE])).toBe("scale");
    expect(resolveBillingPlan([SHOPIFY_BILLING_PLANS.PRO])).toBe("pro");
  });

  it("prefers the highest active tier when multiple subscriptions exist", () => {
    expect(resolveBillingPlan(["Starter", "Growth"])).toBe("scale");
  });
});

describe("resolveCurrentBillingPlan", () => {
  it("uses verified active subscriptions over query params", () => {
    expect(
      resolveCurrentBillingPlan({
        activeSubscriptionNames: [SHOPIFY_BILLING_PLANS.STARTER],
        planHandle: "pro",
        chargeId: "123",
        storedPlan: "free",
      }),
    ).toBe("starter");
  });

  it("does not upgrade from plan_handle or charge_id alone", () => {
    expect(
      resolveCurrentBillingPlan({
        activeSubscriptionNames: [],
        planHandle: "pro",
        chargeId: "attacker-charge",
        storedPlan: "free",
      }),
    ).toBe("free");

    expect(
      resolveCurrentBillingPlan({
        activeSubscriptionNames: [],
        planHandle: "growth",
        chargeId: null,
        storedPlan: "free",
      }),
    ).toBe("free");
  });

  it("keeps the stored plan when Shopify reports no paid subscription", () => {
    expect(
      resolveCurrentBillingPlan({
        activeSubscriptionNames: [],
        planHandle: "pro",
        chargeId: "123",
        storedPlan: "scale",
      }),
    ).toBe("scale");
  });
});

describe("resolvePendingBillingPlan", () => {
  it("returns null for empty or free pending values", () => {
    expect(resolvePendingBillingPlan("")).toBeNull();
    expect(resolvePendingBillingPlan("free")).toBeNull();
    expect(resolvePendingBillingPlan("invalid")).toBeNull();
  });

  it("returns paid tiers when pending", () => {
    expect(resolvePendingBillingPlan("starter")).toBe("starter");
    expect(resolvePendingBillingPlan("pro")).toBe("pro");
  });
});
