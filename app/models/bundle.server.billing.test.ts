import { describe, expect, it } from "vitest";
import { SHOPIFY_BILLING_PLANS } from "../billing.shopify";
import {
  resolveBillingPlan,
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
