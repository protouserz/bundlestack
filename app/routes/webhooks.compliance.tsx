import type { ActionFunctionArgs } from "react-router";
import { redactShopRecords } from "../models/bundle.server";
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

  if (topic === "customers/data_request" || topic === "customers/redact") {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Acknowledged ${topic} for ${shop} — BundleStack stores no customer PII`,
      );
    }
  }

  if (topic === "shop/redact") {
    const shopDomain =
      typeof payload === "object" &&
      payload !== null &&
      "shop_domain" in payload &&
      typeof payload.shop_domain === "string"
        ? payload.shop_domain
        : shop;

    await redactShopRecords(shopDomain);
  }

  return webhookOk();
};
