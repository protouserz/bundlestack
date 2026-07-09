import { BillingInterval } from "@shopify/shopify-app-react-router/server";
import type { BillingConfigSubscriptionLineItemPlan } from "@shopify/shopify-api";
import { PLAN_PRICES, type BillingPlan } from "./billing.plans";

export type { BillingPlan };

export const SHOPIFY_BILLING_PLANS = {
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
  starter: SHOPIFY_BILLING_PLANS.STARTER,
  scale: SHOPIFY_BILLING_PLANS.SCALE,
  pro: SHOPIFY_BILLING_PLANS.PRO,
};

export const ALL_SHOPIFY_BILLING_PLANS: ShopifyBillingPlanName[] = [
  SHOPIFY_BILLING_PLANS.STARTER,
  SHOPIFY_BILLING_PLANS.SCALE,
  SHOPIFY_BILLING_PLANS.PRO,
];

export function getShopifyPlanForTier(
  plan: BillingPlan,
): ShopifyBillingPlanName | null {
  if (plan === "free") return null;
  return BILLING_PLAN_BY_TIER[plan];
}

export function shopifyBillingConfig(): Record<
  ShopifyBillingPlanName,
  BillingConfigSubscriptionLineItemPlan
> {
  return {
    [SHOPIFY_BILLING_PLANS.STARTER]: {
      lineItems: [
        {
          amount: PLAN_PRICES.starter,
          currencyCode: "USD" as const,
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [SHOPIFY_BILLING_PLANS.SCALE]: {
      lineItems: [
        {
          amount: PLAN_PRICES.scale,
          currencyCode: "USD" as const,
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [SHOPIFY_BILLING_PLANS.PRO]: {
      lineItems: [
        {
          amount: PLAN_PRICES.pro,
          currencyCode: "USD" as const,
          interval: BillingInterval.Every30Days,
        },
      ],
    },
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
  const entry = Object.entries(BILLING_PLAN_BY_TIER).find(
    ([, name]) => name === planName,
  );
  if (entry) {
    return entry[0] as Exclude<BillingPlan, "free">;
  }

  const normalized = planName.toLowerCase();
  if (normalized.includes("pro")) return "pro";
  if (normalized.includes("growth") || normalized.includes("scale")) {
    return "scale";
  }
  if (normalized.includes("starter")) return "starter";

  return null;
}
