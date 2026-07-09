import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { BillingError } from "@shopify/shopify-api";

export async function isPartnerDevelopmentStore(
  admin: AdminApiContext,
): Promise<boolean> {
  try {
    const response = await admin.graphql(
      `#graphql
        query BillingShopPlan {
          shop {
            plan {
              partnerDevelopment
            }
          }
        }`,
    );
    const json = await response.json();
    return Boolean(json.data?.shop?.plan?.partnerDevelopment);
  } catch {
    return process.env.NODE_ENV !== "production";
  }
}

export async function resolveBillingTestMode(
  admin: AdminApiContext,
): Promise<boolean> {
  if (await isPartnerDevelopmentStore(admin)) {
    return true;
  }

  if (process.env.SHOPIFY_BILLING_TEST === "true") {
    return true;
  }

  if (process.env.SHOPIFY_BILLING_TEST === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

export function billingReturnUrl(request: Request): string {
  const appUrl = (
    process.env.SHOPIFY_APP_URL || new URL(request.url).origin
  ).replace(/\/$/, "");
  return `${appUrl}/app/billing`;
}

export function formatBillingError(error: unknown): string {
  if (error instanceof BillingError) {
    if (Array.isArray(error.errorData) && error.errorData.length > 0) {
      return error.errorData
        .map((entry: { message?: string }) => entry.message)
        .filter(Boolean)
        .join(" ");
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to start billing. Please try again.";
}

/** billing.request() throws a Response redirect for embedded apps — must propagate. */
export function rethrowIfResponse(error: unknown): void {
  if (error instanceof Response) {
    throw error;
  }
}
