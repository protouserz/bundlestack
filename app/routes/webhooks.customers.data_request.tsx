import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * BundleStack does not persist customer PII (names, emails, order line items).
 * Acknowledge the request — merchants can confirm no customer data is stored.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`, payload);

  return new Response();
};
