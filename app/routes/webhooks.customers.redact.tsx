import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * BundleStack does not persist customer PII. Nothing to redact per customer.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`, payload);

  return new Response();
};
