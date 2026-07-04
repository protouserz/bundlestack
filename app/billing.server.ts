export type BillingPlan = "free" | "starter" | "scale" | "pro";

const PLAN_THRESHOLDS: Record<BillingPlan, number> = {
  free: 0,
  starter: 1000,
  scale: 5000,
  pro: Infinity,
};

export const PLAN_PRICES: Record<BillingPlan, number> = {
  free: 0,
  starter: 14.99,
  scale: 29.99,
  pro: 59.99,
};

export function getPlanForRevenue(revenueGenerated: number): BillingPlan {
  if (revenueGenerated >= PLAN_THRESHOLDS.scale) return "pro";
  if (revenueGenerated >= PLAN_THRESHOLDS.starter) return "scale";
  if (revenueGenerated > 0) return "starter";
  return "free";
}

export function getNextPlan(current: BillingPlan): BillingPlan | null {
  if (current === "free") return "starter";
  if (current === "starter") return "scale";
  if (current === "scale") return "pro";
  return null;
}

// Wire up Shopify Billing API in v2 — see:
// https://shopify.dev/docs/apps/launch/billing
