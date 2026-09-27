import {
  PLAN_LABELS,
  PLAN_PRICES,
  isPaidPlan,
  normalizeBillingPlan,
  SUPPORT_PLAN,
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
  SUPPORT_PLAN,
  formatPlanPrice,
  isPaidPlan,
  normalizeBillingPlan,
} from "./billing.plans";

export function getSuggestedPlanForRedemptions(
  _discountRedemptions: number,
): BillingPlan {
  return "free";
}

/** @deprecated Use getSuggestedPlanForRedemptions */
export const getPlanForRevenue = getSuggestedPlanForRedemptions;

export function getNextPlan(current: BillingPlan): BillingPlan | null {
  return isPaidPlan(current) ? null : SUPPORT_PLAN;
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
  const normalized = normalizeBillingPlan(plan);
  const suggestedPlan = getSuggestedPlanForRedemptions(discountUses);
  const nextPlan = getNextPlan(normalized);
  const monthlyPrice = PLAN_PRICES[normalized];

  return {
    plan: normalized,
    planLabel: PLAN_LABELS[normalized],
    monthlyPrice,
    discountRedemptions: discountUses,
    suggestedPlan,
    suggestedPlanLabel: PLAN_LABELS[suggestedPlan],
    nextPlan,
    nextPlanLabel: nextPlan ? PLAN_LABELS[nextPlan] : null,
    nextPlanPrice: nextPlan ? PLAN_PRICES[nextPlan] : null,
    redemptionsUntilSuggestedTier: null,
    progressToSuggestedTier: 100,
    alertAtEightyPercent: false,
  };
}

export function isBillingPlan(value: string): value is BillingPlan {
  return value === "free" || isPaidPlan(value);
}
