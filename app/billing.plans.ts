export type BillingPlan = "free" | "starter" | "scale" | "pro";

/** The paid plan merchants can subscribe to. Legacy scale/pro map here. */
export const SUPPORT_PLAN = "starter" as const satisfies BillingPlan;

/** Suggested monthly discount redemption counts (unused for gating). */
export const PLAN_THRESHOLDS: Record<BillingPlan, number> = {
  free: 0,
  starter: 0,
  scale: 0,
  pro: 0,
};

export const PLAN_PRICES: Record<BillingPlan, number> = {
  free: 0,
  starter: 2,
  scale: 2,
  pro: 2,
};

export const PLAN_LABELS: Record<BillingPlan, string> = {
  free: "Free",
  starter: "Pro",
  scale: "Pro",
  pro: "Pro",
};

export const PLAN_REVENUE_CAPS: Record<BillingPlan, string> = {
  free: "Quantity breaks, BOGO, and product-page upsells",
  starter: "Gifts, mix & match, builders, coupons, and email support",
  scale: "Gifts, mix & match, builders, coupons, and email support",
  pro: "Gifts, mix & match, builders, coupons, and email support",
};

export const PLAN_FEATURES: Record<BillingPlan, string[]> = {
  free: [
    "Unlimited quantity-break and BOGO offers",
    "Product-page upsells and cross-sells",
    "Product-page theme widget",
    "Automatic Shopify discount sync",
    "Product picker — no manual IDs",
    "Store health monitor",
  ],
  starter: [
    "Everything in Free",
    "Free gifts, mix & match, and bundle builders",
    "Discount codes (coupons)",
    "Email customer support",
  ],
  scale: [
    "Everything in Free",
    "Free gifts, mix & match, and bundle builders",
    "Discount codes (coupons)",
    "Email customer support",
  ],
  pro: [
    "Everything in Free",
    "Free gifts, mix & match, and bundle builders",
    "Discount codes (coupons)",
    "Email customer support",
  ],
};

/** Plans shown on the Billing page. */
export const PLAN_ORDER: BillingPlan[] = ["free", "starter"];

export function isPaidPlan(plan: string): boolean {
  return plan === "starter" || plan === "scale" || plan === "pro";
}

export function normalizeBillingPlan(plan: BillingPlan): BillingPlan {
  return isPaidPlan(plan) ? SUPPORT_PLAN : "free";
}

export function formatPlanPrice(plan: BillingPlan): string {
  const price = PLAN_PRICES[plan];
  return price === 0 ? "$0" : `$${price.toFixed(2)}`;
}
