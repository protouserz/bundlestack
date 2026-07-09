import { describe, expect, it } from "vitest";
import {
  buildExitIframePath,
  extractBillingRedirectFromError,
  getShopifyAppPricingUrl,
  usesShopifyAppPricingSubscriptions,
} from "./billing-session.server";
import { SHOPIFY_BILLING_PLANS } from "./billing.shopify";

describe("getShopifyAppPricingUrl", () => {
  it("builds the Shopify hosted pricing page URL", () => {
    expect(getShopifyAppPricingUrl("bundlestack-dev.myshopify.com")).toBe(
      "https://admin.shopify.com/store/bundlestack-dev/charges/bundlestack/pricing_plans",
    );
  });
});

describe("usesShopifyAppPricingSubscriptions", () => {
  it("detects Shopify App Pricing subscription names", () => {
    expect(usesShopifyAppPricingSubscriptions(["Starter"])).toBe(true);
    expect(
      usesShopifyAppPricingSubscriptions([SHOPIFY_BILLING_PLANS.SCALE]),
    ).toBe(false);
  });
});

describe("buildExitIframePath", () => {
  it("builds exit-iframe path with shop, host, and confirmation URL", () => {
    const request = new Request(
      "https://app.example.com/app/billing?embedded=1&host=abc123",
    );

    expect(
      buildExitIframePath(
        request,
        "bundlestack-dev.myshopify.com",
        "https://admin.shopify.com/charges/confirm",
      ),
    ).toBe(
      "/auth/exit-iframe?shop=bundlestack-dev.myshopify.com&exitIframe=https%3A%2F%2Fadmin.shopify.com%2Fcharges%2Fconfirm&host=abc123",
    );
  });
});

describe("extractBillingRedirectFromError", () => {
  it("extracts confirmation URL from billing redirect response", () => {
    const response = new Response(null, {
      status: 401,
      headers: {
        "X-Shopify-API-Request-Failure-Reauthorize-Url":
          "https://admin.shopify.com/charges/confirm",
      },
    });

    expect(extractBillingRedirectFromError(response)).toEqual({
      confirmationUrl: "https://admin.shopify.com/charges/confirm",
    });
  });

  it("extracts exit iframe URL from redirect response", () => {
    const response = new Response(null, {
      status: 302,
      headers: {
        Location: "/auth/exit-iframe?exitIframe=https%3A%2F%2Fadmin.shopify.com",
      },
    });

    expect(extractBillingRedirectFromError(response)).toEqual({
      exitIframeUrl: "/auth/exit-iframe?exitIframe=https%3A%2F%2Fadmin.shopify.com",
    });
  });
});
