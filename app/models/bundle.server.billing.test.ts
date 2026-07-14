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
  it("uses plan_handle only with an explicit charge_id callback", () => {
    expect(
      resolveCurrentBillingPlan({
        activeSubscriptionNames: [],
        planHandle: "growth",
        chargeId: "123",
        storedPlan: "starter",
      }),
    ).toBe("scale");
  });

  it("does not trust plan_handle alone or sticky storedPlan when ACTIVE is empty", () => {
    expect(
      resolveCurrentBillingPlan({
        activeSubscriptionNames: [],
        planHandle: "pro",
        chargeId: null,
        storedPlan: "pro",
      }),
    ).toBe("free");
  });

  it("prefers live ACTIVE subscriptions over callback handles", () => {
    expect(
      resolveCurrentBillingPlan({
        activeSubscriptionNames: [SHOPIFY_BILLING_PLANS.STARTER],
        planHandle: "pro",
        chargeId: "123",
        storedPlan: "free",
      }),
    ).toBe("starter");
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
