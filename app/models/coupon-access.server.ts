import type { BillingPlan } from "../billing.plans";

type BillingCheck = {
  check: () => Promise<{
    appSubscriptions: Array<{ name: string; status: string }>;
  }>;
};

/** Product is not gated — coupons are included on Free. */
export async function assertCouponsPlanAccess(
  _shop: string,
  _billing?: BillingCheck,
): Promise<{ allowed: boolean; plan: BillingPlan }> {
  return { allowed: true, plan: "free" };
}
