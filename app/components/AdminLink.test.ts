import { describe, expect, it } from "vitest";
import { toShopifyAdminProtocol } from "./AdminLink";

describe("toShopifyAdminProtocol", () => {
  it("converts admin.shopify.com store URLs to shopify://admin paths", () => {
    expect(
      toShopifyAdminProtocol(
        "https://admin.shopify.com/store/bundlestack-dev/themes/current/editor?context=apps",
      ),
    ).toBe("shopify://admin/themes/current/editor?context=apps");
  });

  it("leaves non-admin URLs unchanged", () => {
    expect(toShopifyAdminProtocol("https://example.com/privacy")).toBe(
      "https://example.com/privacy",
    );
  });
});
