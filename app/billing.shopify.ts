import { BillingInterval } from "@shopify/shopify-app-react-router/server";
import type { BillingConfigSubscriptionLineItemPlan } from "@shopify/shopify-api";
import { PLAN_PRICES, SUPPORT_PLAN, type BillingPlan } from "./billing.plans";

export type { BillingPlan };

export const SHOPIFY_BILLING_PLANS = {
  SUPPORT: "BundleStack Support",
  STARTER: "BundleStack Starter",
  SCALE: "BundleStack Growth",
  PRO: "BundleStack Pro",
} as const;

export type ShopifyBillingPlanName =
  (typeof SHOPIFY_BILLING_PLANS)[keyof typeof SHOPIFY_BILLING_PLANS];

export const BILLING_PLAN_BY_TIER: Record<
  Exclude<BillingPlan, "free">,
  ShopifyBillingPlanName
> = {
  starter: SHOPIFY_BILLING_PLANS.SUPPORT,
  scale: SHOPIFY_BILLING_PLANS.SUPPORT,
  pro: SHOPIFY_BILLING_PLANS.SUPPORT,
};

export const ALL_SHOPIFY_BILLING_PLANS: ShopifyBillingPlanName[] = [
  SHOPIFY_BILLING_PLANS.SUPPORT,
  SHOPIFY_BILLING_PLANS.STARTER,
  SHOPIFY_BILLING_PLANS.SCALE,
  SHOPIFY_BILLING_PLANS.PRO,
];

const LEGACY_PLAN_AMOUNTS: Record<
  "STARTER" | "SCALE" | "PRO",
  number
> = {
  STARTER: 7.99,
  SCALE: 14.99,
  PRO: 29.99,
};

export function getShopifyPlanForTier(
  plan: BillingPlan,
): ShopifyBillingPlanName | null {
  if (plan === "free") return null;
  return BILLING_PLAN_BY_TIER[plan];
}

function monthlyPlan(
  amount: number,
): BillingConfigSubscriptionLineItemPlan {
  return {
    lineItems: [
      {
        amount,
        currencyCode: "USD" as const,
        interval: BillingInterval.Every30Days,
      },
    ],
  };
}

export function shopifyBillingConfig(): Record<
  ShopifyBillingPlanName,
  BillingConfigSubscriptionLineItemPlan
> {
  return {
    [SHOPIFY_BILLING_PLANS.SUPPORT]: monthlyPlan(PLAN_PRICES[SUPPORT_PLAN]),
    // Keep legacy names so existing subscriptions can still be read/cancelled.
    [SHOPIFY_BILLING_PLANS.STARTER]: monthlyPlan(LEGACY_PLAN_AMOUNTS.STARTER),
    [SHOPIFY_BILLING_PLANS.SCALE]: monthlyPlan(LEGACY_PLAN_AMOUNTS.SCALE),
    [SHOPIFY_BILLING_PLANS.PRO]: monthlyPlan(LEGACY_PLAN_AMOUNTS.PRO),
  };
}

export function isBillingTestMode(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return process.env.SHOPIFY_BILLING_TEST !== "false";
  }
  return process.env.SHOPIFY_BILLING_TEST === "true";
}

export function getTierForShopifyPlan(
  planName: string,
): Exclude<BillingPlan, "free"> | null {
  const knownPaid = new Set<string>(Object.values(SHOPIFY_BILLING_PLANS));
  if (knownPaid.has(planName)) {
    return SUPPORT_PLAN;
  }

  // Exact aliases only — never substring match (e.g. "Promo" must not map).
  const normalized = planName.toLowerCase().trim();
  const aliases = new Set([
    "support",
    "starter",
    "growth",
    "scale",
    "pro",
  ]);

  return aliases.has(normalized) ? SUPPORT_PLAN : null;
}

/** Map Shopify App Pricing plan_handle values to app billing tiers. */
export function getTierForPlanHandle(
  planHandle: string,
): BillingPlan | null {
  const normalized = planHandle.toLowerCase().trim();
  if (normalized === "free") return "free";

  const tier = getTierForShopifyPlan(planHandle);
  return tier ?? null;
}
