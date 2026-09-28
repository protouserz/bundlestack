import type { BillingPlan } from "../billing.plans";
import { PROMOTION_TYPES, type PromotionType } from "./promotion.types";
import {
  planAllowsAovFeatures,
  resolveShopAccessPlan,
} from "./plan-access.server";

type BillingCheck = {
  check: () => Promise<{
    appSubscriptions: Array<{ name: string; status: string }>;
  }>;
};

/** Product-page upsell / cross-sell stays on Free. */
export const FREE_PROMOTION_TYPES: readonly PromotionType[] = ["fbt"];

/** FBT is free; other AOV promotion types require Pro. */
export function planIncludesPromotionType(
  plan: BillingPlan,
  type: PromotionType,
): boolean {
  if (FREE_PROMOTION_TYPES.includes(type)) {
    return true;
  }
  return planAllowsAovFeatures(plan);
}

export async function assertPromotionPlanAccess(
  shop: string,
  type: PromotionType,
  billing?: BillingCheck,
): Promise<{ allowed: boolean; plan: BillingPlan }> {
  const plan = await resolveShopAccessPlan(shop, billing);
  return {
    allowed: planIncludesPromotionType(plan, type),
    plan,
  };
}

export async function assertAnyPromotionPlanAccess(
  shop: string,
  billing?: BillingCheck,
): Promise<{
  allowed: boolean;
  plan: BillingPlan;
  coreAllowed: boolean;
  advancedAllowed: boolean;
}> {
  const plan = await resolveShopAccessPlan(shop, billing);
  const allowed = PROMOTION_TYPES.some((type) =>
    planIncludesPromotionType(plan, type),
  );
  const advancedAllowed = planAllowsAovFeatures(plan);
  return {
    allowed,
    plan,
    coreAllowed: allowed,
    advancedAllowed,
  };
}
