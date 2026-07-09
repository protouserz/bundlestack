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
  if (isManagedPricingBillingError(error)) {
    return "Managed App Pricing is enabled for this app in the Partner Dashboard. Disable it under Distribution → Pricing to use in-app upgrades, or manage billing only through Shopify's app settings.";
  }

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

const BILLING_CONFIRMATION_HEADER =
  "X-Shopify-API-Request-Failure-Reauthorize-Url";

/** Pull billing approval URL from billing.request()'s thrown Response. */
export function extractBillingRedirectFromError(error: unknown): {
  confirmationUrl?: string;
  exitIframeUrl?: string;
} | null {
  if (!(error instanceof Response)) return null;

  const confirmationUrl = error.headers.get(BILLING_CONFIRMATION_HEADER);
  if (confirmationUrl) {
    return { confirmationUrl };
  }

  const location = error.headers.get("Location");
  if (location?.includes("exit-iframe")) {
    return { exitIframeUrl: location };
  }

  return null;
}

export function isManagedPricingBillingError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /managed pricing/i.test(message);
}
