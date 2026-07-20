import type { ActionFunctionArgs } from "react-router";
import { clearShopSessions } from "../models/bundle.server";
import { cleanupAllShopDiscounts } from "../models/discount.server";
import {
  authenticateWebhookRequest,
  headers,
  loader,
  webhookOk,
} from "../utils/webhooks.server";

export { headers, loader };

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, admin } = await authenticateWebhookRequest(request);

  if (process.env.NODE_ENV !== "production") {
    console.log(`Received ${topic} webhook for ${shop}`);
  }

  // Remove storefront discounts and OAuth sessions immediately. Keep offer
  // configuration until Shopify's shop/redact (~48h) so deploys / accidental
  // reinstalls do not wipe merchant work.
  if (admin) {
    try {
      await cleanupAllShopDiscounts(admin, shop);
    } catch (error) {
      console.error(`Failed to cleanup discounts for ${shop}:`, error);
    }
  } else {
    console.warn(
      `app/uninstalled for ${shop}: no admin API context — Shopify discount cleanup may be incomplete`,
    );
  }

  await clearShopSessions(shop);

  return webhookOk();
};
