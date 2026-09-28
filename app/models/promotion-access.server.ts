import type { BillingPlan } from "../billing.plans";
import type { PromotionType } from "./promotion.types";
import {
  planAllowsAovFeatures,
  resolveShopAccessPlan,
} from "./plan-access.server";

type BillingCheck = {
  check: () => Promise<{
    appSubscriptions: Array<{ name: string; status: string }>;
  }>;
};

/** AOV promotions (BOGO+ beyond quantity breaks) require the paid Pro plan. */
export function planIncludesPromotionType(
  plan: BillingPlan,
  _type: PromotionType,
): boolean {
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
  const allowed = planAllowsAovFeatures(plan);
  return {
    allowed,
    plan,
    coreAllowed: allowed,
    advancedAllowed: allowed,
  };
}
