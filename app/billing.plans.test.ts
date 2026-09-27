import { describe, expect, it } from "vitest";
import {
  PLAN_LABELS,
  PLAN_ORDER,
  PLAN_PRICES,
  SUPPORT_PLAN,
  isPaidPlan,
  type BillingPlan,
} from "./billing.plans";

describe("billing plans", () => {
  it("defines a price and label for every plan tier", () => {
    for (const plan of PLAN_ORDER) {
      expect(PLAN_LABELS[plan]).toBeTruthy();
      expect(PLAN_PRICES[plan]).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps free tier at zero cost", () => {
    expect(PLAN_PRICES.free).toBe(0);
  });

  it("offers free and a $2 support plan", () => {
    const tiers: BillingPlan[] = ["free", "starter"];
    expect(PLAN_ORDER).toEqual(tiers);
    expect(PLAN_PRICES[SUPPORT_PLAN]).toBe(2);
    expect(PLAN_LABELS[SUPPORT_PLAN]).toBe("Support");
    expect(isPaidPlan("starter")).toBe(true);
    expect(isPaidPlan("free")).toBe(false);
  });
});
