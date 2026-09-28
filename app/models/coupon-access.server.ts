import type { BillingPlan } from "../billing.plans";
import {
  planAllowsAovFeatures,
  resolveShopAccessPlan,
} from "./plan-access.server";

type BillingCheck = {
  check: () => Promise<{
    appSubscriptions: Array<{ name: string; status: string }>;
  }>;
};

/** Discount codes require the paid Pro plan. */
export async function assertCouponsPlanAccess(
  shop: string,
  billing?: BillingCheck,
): Promise<{ allowed: boolean; plan: BillingPlan }> {
  const plan = await resolveShopAccessPlan(shop, billing);
  return {
    allowed: planAllowsAovFeatures(plan),
    plan,
  };
}
