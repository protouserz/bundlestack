import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { cleanupShopData } from "../models/bundle.server";

/** Fired 48 hours after uninstall — erase any remaining shop data. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`, payload);

  const shopDomain =
    typeof payload === "object" &&
    payload !== null &&
    "shop_domain" in payload &&
    typeof payload.shop_domain === "string"
      ? payload.shop_domain
      : shop;

  await cleanupShopData(shopDomain);

  return new Response();
};
