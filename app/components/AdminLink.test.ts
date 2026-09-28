import { describe, expect, it } from "vitest";
import { toShopifyAdminProtocol, themeEmbedActivateUrl } from "./AdminLink";

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

describe("themeEmbedActivateUrl", () => {
  it("builds an app-embed deep link for the product template", () => {
    expect(
      themeEmbedActivateUrl("pawnest-2272.myshopify.com", "4aade1f433c3c5bd867c99cce348cede"),
    ).toBe(
      "https://admin.shopify.com/store/pawnest-2272/themes/current/editor?context=apps&template=product&activateAppId=4aade1f433c3c5bd867c99cce348cede/bundle-widget-embed",
    );
  });

  it("adds a product previewPath so the editor opens a live product", () => {
    expect(
      themeEmbedActivateUrl(
        "pawnest-2272.myshopify.com",
        "4aade1f433c3c5bd867c99cce348cede",
        "forest-bed",
      ),
    ).toBe(
      "https://admin.shopify.com/store/pawnest-2272/themes/current/editor?context=apps&template=product&activateAppId=4aade1f433c3c5bd867c99cce348cede/bundle-widget-embed&previewPath=%2Fproducts%2Fforest-bed",
    );
  });
});
