import type { BillingPlan } from "../billing.plans";
import type { PromotionType } from "./promotion.types";

type BillingCheck = {
  check: () => Promise<{
    appSubscriptions: Array<{ name: string; status: string }>;
  }>;
};

/** Product is not gated — Free includes every promotion type. */
export function planIncludesPromotionType(
  _plan: BillingPlan,
  _type: PromotionType,
): boolean {
  return true;
}

export async function assertPromotionPlanAccess(
  _shop: string,
  _type: PromotionType,
  _billing?: BillingCheck,
): Promise<{ allowed: boolean; plan: BillingPlan }> {
  return { allowed: true, plan: "free" };
}

export async function assertAnyPromotionPlanAccess(
  _shop: string,
  _billing?: BillingCheck,
): Promise<{
  allowed: boolean;
  plan: BillingPlan;
  coreAllowed: boolean;
  advancedAllowed: boolean;
}> {
  return {
    allowed: true,
    plan: "free",
    coreAllowed: true,
    advancedAllowed: true,
  };
}
