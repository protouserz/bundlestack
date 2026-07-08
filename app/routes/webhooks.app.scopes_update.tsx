import type { ActionFunctionArgs } from "react-router";
import db from "../db.server";
import {
  authenticateWebhookRequest,
  headers,
  loader,
  webhookOk,
} from "../utils/webhooks.server";

export { headers, loader };

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } =
    await authenticateWebhookRequest(request);

  if (process.env.NODE_ENV !== "production") {
    console.log(`Received ${topic} webhook for ${shop}`);
  }

  const current = payload.current as string[];
  if (session) {
    await db.session.update({
      where: {
        id: session.id,
      },
      data: {
        scope: current.toString(),
      },
    });
  }

  return webhookOk();
};
