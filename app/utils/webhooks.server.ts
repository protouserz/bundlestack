import type { ActionFunctionArgs, HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export function rejectNonPost() {
  throw new Response("Method Not Allowed", {
    status: 405,
    statusText: "Method Not Allowed",
  });
}

export const loader = () => rejectNonPost();

export function webhookOk() {
  return new Response(null, { status: 200 });
}

export async function authenticateWebhookRequest(request: Request) {
  return authenticate.webhook(request);
}

export type WebhookActionArgs = ActionFunctionArgs;
