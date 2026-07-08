import { describe, expect, it } from "vitest";
import {
  PLAN_LABELS,
  PLAN_ORDER,
  PLAN_PRICES,
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

  it("orders plans from free to pro", () => {
    const tiers: BillingPlan[] = ["free", "starter", "scale", "pro"];
    expect(PLAN_ORDER).toEqual(tiers);
  });
});
