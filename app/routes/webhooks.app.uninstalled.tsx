import type { ActionFunctionArgs } from "react-router";
import { cleanupShopData } from "../models/bundle.server";
import { cleanupAllShopDiscounts } from "../models/discount.server";
import db from "../db.server";
import {
  authenticateWebhookRequest,
  headers,
  loader,
  webhookOk,
} from "../utils/webhooks.server";

export { headers, loader };

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic, admin } = await authenticateWebhookRequest(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (admin) {
    try {
      await cleanupAllShopDiscounts(admin, shop);
    } catch (error) {
      console.error(`Failed to cleanup discounts for ${shop}:`, error);
    }
  }

  await cleanupShopData(shop);

  if (session) {
    await db.session.deleteMany({ where: { shop } });
  }

  return webhookOk();
};
