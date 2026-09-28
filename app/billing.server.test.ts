import { describe, expect, it } from "vitest";
import {
  getBillingSummary,
  getNextPlan,
  getSuggestedPlanForRedemptions,
} from "./billing.server";

describe("getSuggestedPlanForRedemptions", () => {
  it("does not upsell the product based on redemption volume", () => {
    expect(getSuggestedPlanForRedemptions(0)).toBe("free");
    expect(getSuggestedPlanForRedemptions(5000)).toBe("free");
  });
});

describe("getNextPlan", () => {
  it("offers Pro from Free and nothing after that", () => {
    expect(getNextPlan("free")).toBe("starter");
    expect(getNextPlan("starter")).toBeNull();
    expect(getNextPlan("pro")).toBeNull();
  });
});

describe("getBillingSummary", () => {
  it("treats legacy paid tiers as Pro", () => {
    const summary = getBillingSummary("scale", 1200);

    expect(summary.discountRedemptions).toBe(1200);
    expect(summary.plan).toBe("starter");
    expect(summary.planLabel).toBe("Pro");
    expect(summary.monthlyPrice).toBe(2);
    expect(summary.suggestedPlan).toBe("free");
  });
});
