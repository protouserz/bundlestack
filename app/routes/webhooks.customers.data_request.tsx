import type { ActionFunctionArgs } from "react-router";
import {
  authenticateWebhookRequest,
  headers,
  loader,
  webhookOk,
} from "../utils/webhooks.server";

export { headers, loader };

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticateWebhookRequest(request);

  console.log(`Received ${topic} webhook for ${shop}`, payload);

  return webhookOk();
};
