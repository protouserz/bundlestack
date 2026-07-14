import type { ActionFunctionArgs } from "react-router";
import {
  clearPendingBillingPlan,
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
    return "free";
  }

  return getTierForShopifyPlan(name) ?? "free";
}

/**
 * Keep local billingPlan in sync when merchants approve, cancel, or
 * expire App Subscriptions (BFS billing hygiene).
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticateWebhookRequest(request);

  if (process.env.NODE_ENV !== "production") {
    console.log(`Received ${topic} webhook for ${shop}`);
  }

  const nextPlan = resolvePlanFromSubscriptionWebhook(
    payload as SubscriptionPayload,
  );

  await setShopBillingPlan(shop, nextPlan);
  await clearPendingBillingPlan(shop);

  return webhookOk();
};
