import { describe, expect, it } from "vitest";
import {
  getBillingSummary,
  getSuggestedPlanForRedemptions,
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
