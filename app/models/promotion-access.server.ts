import {
  planIncludesCorePromotions,
  planIncludesAdvancedPromotions,
  type BillingPlan,
} from "../billing.server";
import type { PromotionType } from "./promotion.types";
import { resolveShopBillingPlan } from "./coupon-access.server";

type BillingCheck = {
  check: () => Promise<{
    appSubscriptions: Array<{ name: string; status: string }>;
  }>;
};

export { resolveShopBillingPlan };

/** Starter+: BOGO, free gifts, mix & match. Growth+: builders + FBT. */
export function planIncludesPromotionType(
  plan: BillingPlan,
  type: PromotionType,
): boolean {
  if (type === "bundle_builder" || type === "fbt") {
    return planIncludesAdvancedPromotions(plan);
  }
  return planIncludesCorePromotions(plan);
}

export async function assertPromotionPlanAccess(
  shop: string,
  type: PromotionType,
  billing?: BillingCheck,
): Promise<{ allowed: boolean; plan: BillingPlan }> {
  const plan = await resolveShopBillingPlan(shop, billing);
  return {
    plan,
    allowed: planIncludesPromotionType(plan, type),
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
  const plan = await resolveShopBillingPlan(shop, billing);
  return {
    plan,
    allowed: planIncludesCorePromotions(plan),
    coreAllowed: planIncludesCorePromotions(plan),
    advancedAllowed: planIncludesAdvancedPromotions(plan),
  };
}
