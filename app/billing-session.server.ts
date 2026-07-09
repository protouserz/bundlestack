import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import { BillingError } from "@shopify/shopify-api";
import {
  shopifyBillingConfig,
  type ShopifyBillingPlanName,
} from "./billing.shopify";

const APP_SUBSCRIPTION_CREATE = `#graphql
  mutation AppSubscriptionCreate(
    $name: String!
    $returnUrl: URL!
    $test: Boolean
    $lineItems: [AppSubscriptionLineItemInput!]!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      test: $test
      lineItems: $lineItems
    ) {
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

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

export function buildExitIframePath(
  request: Request,
  shop: string,
  confirmationUrl: string,
): string {
  const requestUrl = new URL(request.url);
  const params = new URLSearchParams({
    shop,
    exitIframe: confirmationUrl,
  });
  const host = requestUrl.searchParams.get("host");
  if (host) {
    params.set("host", host);
  }
  return `/auth/exit-iframe?${params.toString()}`;
}

export async function createBillingConfirmationUrl(
  admin: AdminApiContext,
  planName: ShopifyBillingPlanName,
  returnUrl: string,
  isTest: boolean,
): Promise<string> {
  const planConfig = shopifyBillingConfig()[planName];
  const lineItems = planConfig.lineItems.map((item) => ({
    plan: {
      appRecurringPricingDetails: {
        interval: item.interval,
        price: {
          amount: item.amount,
          currencyCode: item.currencyCode,
        },
      },
    },
  }));

  const response = await admin.graphql(APP_SUBSCRIPTION_CREATE, {
    variables: {
      name: planName,
      returnUrl,
      test: isTest,
      lineItems,
    },
  });

  const json = await response.json();
  const payload = json.data?.appSubscriptionCreate as
    | {
        confirmationUrl?: string | null;
        userErrors?: Array<{ field?: string[] | null; message: string }>;
      }
    | undefined;
  const userErrors = payload?.userErrors ?? [];

  if (userErrors.length > 0) {
    throw new BillingError({
      message: userErrors.map((entry) => entry.message).join(" "),
      errorData: userErrors,
    });
  }

  const confirmationUrl = payload?.confirmationUrl;
  if (!confirmationUrl) {
    throw new Error("Shopify did not return a billing confirmation URL.");
  }

  return confirmationUrl;
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
