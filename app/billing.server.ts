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

export function getSuggestedPlanForRedemptions(
  discountRedemptions: number,
): BillingPlan {
  if (discountRedemptions >= PLAN_THRESHOLDS.pro) return "pro";
  if (discountRedemptions >= PLAN_THRESHOLDS.scale) return "scale";
  if (discountRedemptions >= PLAN_THRESHOLDS.starter) return "starter";
  return "free";
}

/** @deprecated Use getSuggestedPlanForRedemptions */
export const getPlanForRevenue = getSuggestedPlanForRedemptions;

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
  discountRedemptions: number;
  suggestedPlan: BillingPlan;
  suggestedPlanLabel: string;
  nextPlan: BillingPlan | null;
  nextPlanLabel: string | null;
  nextPlanPrice: number | null;
  redemptionsUntilSuggestedTier: number | null;
  progressToSuggestedTier: number;
  alertAtEightyPercent: boolean;
};

export function getBillingSummary(
  plan: BillingPlan,
  discountUses: number,
): BillingSummary {
  const suggestedPlan = getSuggestedPlanForRedemptions(discountUses);
  const nextPlan = getNextPlan(plan);
  const monthlyPrice = PLAN_PRICES[plan];

  let redemptionsUntilSuggestedTier: number | null = null;
  let progressToSuggestedTier = 100;

  if (nextPlan) {
    const nextThreshold = PLAN_THRESHOLDS[nextPlan];
    const currentThreshold = PLAN_THRESHOLDS[plan];
    redemptionsUntilSuggestedTier = Math.max(0, nextThreshold - discountUses);
    const range = nextThreshold - currentThreshold;
    progressToSuggestedTier =
      range > 0
        ? Math.min(100, ((discountUses - currentThreshold) / range) * 100)
        : 100;
  }

  const alertAtEightyPercent =
    nextPlan !== null && progressToSuggestedTier >= 80 && progressToSuggestedTier < 100;

  return {
    plan,
    planLabel: PLAN_LABELS[plan],
    monthlyPrice,
    discountRedemptions: discountUses,
    suggestedPlan,
    suggestedPlanLabel: PLAN_LABELS[suggestedPlan],
    nextPlan,
    nextPlanLabel: nextPlan ? PLAN_LABELS[nextPlan] : null,
    nextPlanPrice: nextPlan ? PLAN_PRICES[nextPlan] : null,
    redemptionsUntilSuggestedTier,
    progressToSuggestedTier: Math.round(Math.max(0, progressToSuggestedTier)),
    alertAtEightyPercent,
  };
}

export function isBillingPlan(value: string): value is BillingPlan {
  return value === "free" || value === "starter" || value === "scale" || value === "pro";
}

/** Coupons require Starter or higher. */
export function planIncludesCoupons(plan: BillingPlan): boolean {
  return plan === "starter" || plan === "scale" || plan === "pro";
}

/** BOGO, free gifts, and mix & match require Starter or higher. */
export function planIncludesCorePromotions(plan: BillingPlan): boolean {
  return plan === "starter" || plan === "scale" || plan === "pro";
}

/** Bundle builders and FBT require Growth (scale) or Pro. */
export function planIncludesAdvancedPromotions(plan: BillingPlan): boolean {
  return plan === "scale" || plan === "pro";
}
