import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { cleanupShopData } from "../models/bundle.server";
import { cleanupAllShopDiscounts } from "../models/discount.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

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

  return new Response();
};
