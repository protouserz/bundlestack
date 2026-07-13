import { describe, expect, it } from "vitest";
import {
  getBillingSummary,
  getSuggestedPlanForRedemptions,
  planIncludesAdvancedPromotions,
  planIncludesCorePromotions,
  planIncludesCoupons,
} from "./billing.server";

describe("getSuggestedPlanForRedemptions", () => {
  it("suggests free for low redemption counts", () => {
    expect(getSuggestedPlanForRedemptions(0)).toBe("free");
    expect(getSuggestedPlanForRedemptions(499)).toBe("free");
  });

  it("suggests higher tiers as redemptions grow", () => {
    expect(getSuggestedPlanForRedemptions(500)).toBe("starter");
    expect(getSuggestedPlanForRedemptions(2000)).toBe("scale");
    expect(getSuggestedPlanForRedemptions(5000)).toBe("pro");
  });
});

describe("getBillingSummary", () => {
  it("tracks discount redemptions without implying automatic billing", () => {
    const summary = getBillingSummary("free", 1200);

    expect(summary.discountRedemptions).toBe(1200);
    expect(summary.suggestedPlan).toBe("starter");
    expect(summary.suggestedPlanLabel).toBe("Starter");
    expect(summary.plan).toBe("free");
  });
});

describe("planIncludesCoupons", () => {
  it("allows starter and higher only", () => {
    expect(planIncludesCoupons("free")).toBe(false);
    expect(planIncludesCoupons("starter")).toBe(true);
    expect(planIncludesCoupons("scale")).toBe(true);
    expect(planIncludesCoupons("pro")).toBe(true);
  });
});

describe("planIncludesCorePromotions", () => {
  it("matches coupon gating (Starter+)", () => {
    expect(planIncludesCorePromotions("free")).toBe(false);
    expect(planIncludesCorePromotions("starter")).toBe(true);
  });
});

describe("planIncludesAdvancedPromotions", () => {
  it("requires Growth or Pro", () => {
    expect(planIncludesAdvancedPromotions("starter")).toBe(false);
    expect(planIncludesAdvancedPromotions("scale")).toBe(true);
    expect(planIncludesAdvancedPromotions("pro")).toBe(true);
  });
});
