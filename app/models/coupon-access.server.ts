import {
  isBillingPlan,
  planIncludesCoupons,
  type BillingPlan,
} from "../billing.server";
import {
  getShopSettings,
  resolveBillingPlan,
  resolveEntitlementBillingPlan,
  setShopBillingPlan,
} from "./bundle.server";

type BillingCheck = {
  check: () => Promise<{
    appSubscriptions: Array<{ name: string; status: string }>;
  }>;
};

function allowDevCouponsBypass() {
  return process.env.ALLOW_DEV_COUPONS === "true";
}

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
    const activeSubscriptionNames = billingCheck.appSubscriptions
      .filter((subscription) => subscription.status === "ACTIVE")
      .map((subscription) => subscription.name);

    const plan = resolveEntitlementBillingPlan(activeSubscriptionNames);

    // Keep local billingPlan aligned with Shopify when we can see LIVE status.
    if (plan !== storedPlan) {
      await setShopBillingPlan(shop, plan);
    }

    return plan;
  } catch {
    // Billing API unavailable — fall back to last known plan (graceful).
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
    allowed: planIncludesCoupons(plan) || allowDevCouponsBypass(),
  };
}

// Re-export for tests that previously depended on subscription-only path.
export { resolveBillingPlan };
