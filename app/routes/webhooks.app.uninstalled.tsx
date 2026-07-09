import type { ActionFunctionArgs } from "react-router";
import { redactShopRecords } from "../models/bundle.server";
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

  if (admin) {
    try {
      await cleanupAllShopDiscounts(admin, shop);
    } catch (error) {
      console.error(`Failed to cleanup discounts for ${shop}:`, error);
    }
  }

  await redactShopRecords(shop);

  return webhookOk();
};
