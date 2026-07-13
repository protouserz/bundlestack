import {
  isBillingPlan,
  planIncludesCoupons,
  type BillingPlan,
} from "../billing.server";
import { getShopSettings } from "./bundle.server";
import { getTierForShopifyPlan } from "../billing.shopify";
import { PLAN_ORDER } from "../billing.plans";

type BillingCheck = {
  check: () => Promise<{
    appSubscriptions: Array<{ name: string; status: string }>;
  }>;
};

export async function resolveShopBillingPlan(
  shop: string,
  billing?: BillingCheck,
): Promise<BillingPlan> {
  const settings = await getShopSettings(shop);
  const storedPlan = isBillingPlan(settings.billingPlan)
    ? settings.billingPlan
    : "free";

  if (!billing) {
    return storedPlan;
  }

  try {
    const billingCheck = await billing.check();
    const activeNames = billingCheck.appSubscriptions
      .filter((subscription) => subscription.status === "ACTIVE")
      .map((subscription) => subscription.name);

    let bestPlan: BillingPlan = "free";
    for (const name of activeNames) {
      const tier = getTierForShopifyPlan(name);
      if (!tier) continue;
      if (PLAN_ORDER.indexOf(tier) > PLAN_ORDER.indexOf(bestPlan)) {
        bestPlan = tier;
      }
    }

    return bestPlan !== "free" ? bestPlan : storedPlan;
  } catch {
    return storedPlan;
  }
}

export async function assertCouponsPlanAccess(
  shop: string,
  billing?: BillingCheck,
): Promise<{ allowed: boolean; plan: BillingPlan }> {
  const plan = await resolveShopBillingPlan(shop, billing);
  return {
    plan,
    allowed: planIncludesCoupons(plan),
  };
}
