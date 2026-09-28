import { isPaidPlan, type BillingPlan } from "../billing.plans";
import { getShopBillingPlan, resolveCurrentBillingPlan } from "./bundle.server";

type BillingCheck = {
  check: () => Promise<{
    appSubscriptions: Array<{ name: string; status: string }>;
  }>;
};

export async function resolveShopAccessPlan(
  shop: string,
  billing?: BillingCheck,
): Promise<BillingPlan> {
  const storedPlan = await getShopBillingPlan(shop);

  if (!billing) {
    return storedPlan;
  }

  try {
    const billingCheck = await billing.check();
    const activeSubscriptionNames = billingCheck.appSubscriptions
      .filter((subscription) => subscription.status === "ACTIVE")
      .map((subscription) => subscription.name);

    return resolveCurrentBillingPlan({
      activeSubscriptionNames,
      storedPlan,
    });
  } catch {
    return storedPlan;
  }
}

export function planAllowsAovFeatures(plan: BillingPlan): boolean {
  return isPaidPlan(plan);
}
