import type { ActionFunctionArgs } from "react-router";
import {
  clearPendingBillingPlan,
  resolveBillingPlan,
  setShopBillingPlan,
} from "../models/bundle.server";
import { getTierForShopifyPlan } from "../billing.shopify";
import {
  authenticateWebhookRequest,
  headers,
  loader,
  webhookOk,
} from "../utils/webhooks.server";
import type { BillingPlan } from "../billing.plans";

export { headers, loader };

type SubscriptionPayload = {
  name?: string;
  status?: string;
  app_subscription?: {
    name?: string;
    status?: string;
    admin_graphql_api_id?: string;
  };
};

export function resolvePlanFromSubscriptionWebhook(
  payload: SubscriptionPayload,
): BillingPlan {
  const subscription = payload.app_subscription ?? payload;
  const status = (subscription.status || "").toUpperCase();
  const name = subscription.name || "";

  if (status === "ACTIVE" || status === "ACCEPTED") {
    return getTierForShopifyPlan(name) ?? "free";
  }

  if (
    status === "CANCELLED" ||
    status === "DECLINED" ||
    status === "EXPIRED" ||
    status === "FROZEN"
  ) {
    // Payload alone is not enough when multiple subscriptions may be active;
    // action re-queries Shopify when admin is available.
    return "free";
  }

  return getTierForShopifyPlan(name) ?? "free";
}

/**
 * Keep local billingPlan in sync when merchants approve, cancel, or
 * expire App Subscriptions (BFS billing hygiene).
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const context = await authenticateWebhookRequest(request);
  const { shop, topic, payload } = context;
  const admin = "admin" in context ? context.admin : undefined;

  if (process.env.NODE_ENV !== "production") {
    console.log(`Received ${topic} webhook for ${shop}`);
  }

  let nextPlan = resolvePlanFromSubscriptionWebhook(
    payload as SubscriptionPayload,
  );

  // Prefer live ACTIVE subscriptions over a single cancelled event so
  // upgrade flows that cancel then activate don't drop entitlement.
  if (admin) {
    try {
      const response = await admin.graphql(
        `#graphql
          query activeAppSubscriptions {
            currentAppInstallation {
              activeSubscriptions {
                name
                status
              }
            }
          }`,
      );
      const json = await response.json();
      const subscriptions =
        json.data?.currentAppInstallation?.activeSubscriptions ?? [];
      const activeNames = subscriptions
        .filter(
          (subscription: { status?: string }) =>
            (subscription.status || "").toUpperCase() === "ACTIVE",
        )
        .map((subscription: { name?: string }) => subscription.name || "")
        .filter(Boolean);
      nextPlan = resolveBillingPlan(activeNames);
    } catch {
      // Fall back to payload-derived plan.
    }
  }

  await setShopBillingPlan(shop, nextPlan);
  await clearPendingBillingPlan(shop);

  return webhookOk();
};
