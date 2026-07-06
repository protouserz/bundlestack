export type BillingPlan = "free" | "starter" | "scale" | "pro";

/** Suggested monthly store volume for each plan tier. */
export const PLAN_THRESHOLDS: Record<BillingPlan, number> = {
  free: 0,
  starter: 500,
  scale: 2000,
  pro: 5000,
};

export const PLAN_PRICES: Record<BillingPlan, number> = {
  free: 0,
  starter: 7.99,
  scale: 14.99,
  pro: 29.99,
};

export const PLAN_LABELS: Record<BillingPlan, string> = {
  free: "Free",
  starter: "Starter",
  scale: "Growth",
  pro: "Pro",
};

export const PLAN_REVENUE_CAPS: Record<BillingPlan, string> = {
  free: "Best for stores getting started",
  starter: "For growing stores up to ~$2k/mo volume",
  scale: "For scaling stores up to ~$5k/mo volume",
  pro: "For high-volume stores with no cap",
};

export const PLAN_FEATURES: Record<BillingPlan, string[]> = {
  free: [
    "Unlimited quantity-break offers",
    "Theme widget & app proxy",
    "Automatic Shopify discounts",
  ],
  starter: [
    "Everything in Free",
    "Higher revenue ceiling",
    "Email support",
  ],
  scale: [
    "Everything in Starter",
    "5× revenue headroom vs Starter",
    "Priority support",
  ],
  pro: [
    "Everything in Growth",
    "No revenue cap",
    "Best value at scale",
  ],
};

export const PLAN_ORDER: BillingPlan[] = ["free", "starter", "scale", "pro"];

export function formatPlanPrice(plan: BillingPlan): string {
  const price = PLAN_PRICES[plan];
  return price === 0 ? "$0" : `$${price.toFixed(2)}`;
}
