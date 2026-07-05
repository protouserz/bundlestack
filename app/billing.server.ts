import {
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_THRESHOLDS,
  type BillingPlan,
} from "./billing.plans";

export type { BillingPlan } from "./billing.plans";
export {
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_ORDER,
  PLAN_PRICES,
  PLAN_REVENUE_CAPS,
  PLAN_THRESHOLDS,
  formatPlanPrice,
} from "./billing.plans";

export function getPlanForRevenue(revenueGenerated: number): BillingPlan {
  if (revenueGenerated >= PLAN_THRESHOLDS.pro) return "pro";
  if (revenueGenerated >= PLAN_THRESHOLDS.scale) return "scale";
  if (revenueGenerated >= PLAN_THRESHOLDS.starter) return "starter";
  return "free";
}

export function getNextPlan(current: BillingPlan): BillingPlan | null {
  if (current === "free") return "starter";
  if (current === "starter") return "scale";
  if (current === "scale") return "pro";
  return null;
}

export type BillingSummary = {
  plan: BillingPlan;
  planLabel: string;
  monthlyPrice: number;
  revenueGenerated: number;
  nextPlan: BillingPlan | null;
  nextPlanLabel: string | null;
  nextPlanPrice: number | null;
  revenueUntilNextTier: number | null;
  progressToNextTier: number;
  alertAtEightyPercent: boolean;
};

export function getBillingSummary(revenueGenerated: number): BillingSummary {
  const plan = getPlanForRevenue(revenueGenerated);
  const nextPlan = getNextPlan(plan);
  const monthlyPrice = PLAN_PRICES[plan];

  let revenueUntilNextTier: number | null = null;
  let progressToNextTier = 100;

  if (nextPlan) {
    const nextThreshold = PLAN_THRESHOLDS[nextPlan];
    const currentThreshold = PLAN_THRESHOLDS[plan];
    revenueUntilNextTier = Math.max(0, nextThreshold - revenueGenerated);
    const range = nextThreshold - currentThreshold;
    progressToNextTier =
      range > 0
        ? Math.min(100, ((revenueGenerated - currentThreshold) / range) * 100)
        : 100;
  }

  const alertAtEightyPercent =
    nextPlan !== null && progressToNextTier >= 80 && progressToNextTier < 100;

  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    monthlyPrice,
    revenueGenerated,
    nextPlan,
    nextPlanLabel: nextPlan ? PLAN_LABELS[nextPlan] : null,
    nextPlanPrice: nextPlan ? PLAN_PRICES[nextPlan] : null,
    revenueUntilNextTier,
    progressToNextTier: Math.round(Math.max(0, progressToNextTier)),
    alertAtEightyPercent,
  };
}
