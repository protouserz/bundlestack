import { describe, expect, it } from "vitest";
import { extractBillingRedirectFromError } from "./billing-session.server";

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
