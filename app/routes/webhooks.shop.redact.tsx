import type { ActionFunctionArgs } from "react-router";
import { cleanupShopData } from "../models/bundle.server";
import {
  authenticateWebhookRequest,
  headers,
  loader,
  webhookOk,
} from "../utils/webhooks.server";

export { headers, loader };

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticateWebhookRequest(request);

  if (process.env.NODE_ENV !== "production") {
    console.log(`Received ${topic} webhook for ${shop}`);
  }

  const shopDomain =
    typeof payload === "object" &&
    payload !== null &&
    "shop_domain" in payload &&
    typeof payload.shop_domain === "string"
      ? payload.shop_domain
      : shop;

  await cleanupShopData(shopDomain);

  return webhookOk();
};
