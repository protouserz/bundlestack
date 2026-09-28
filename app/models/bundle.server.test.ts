import { describe, expect, it } from "vitest";
import { parseOfferForm, isCatalogOffer, offerDiscountSummary, selectStorefrontBadges } from "./bundle.server";
import { storefrontBadgeText, storefrontPreviewModel } from "./offer";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

const validProductId = "gid://shopify/Product/123456789";
const validTiers = JSON.stringify([
  { minQty: 2, discountType: "percentage", discountValue: 10 },
]);

describe("parseOfferForm", () => {
  it("parses a valid offer form", () => {
    const result = parseOfferForm(
      form({
        title: "Buy more save more",
        status: "active",
        productIds: validProductId,
        tiers: validTiers,
      }),
    );

    expect(result.title).toBe("Buy more save more");
    expect(result.status).toBe("active");
    expect(result.productIds).toEqual([validProductId]);
    expect(result.tiers).toHaveLength(1);
  });

  it("rejects missing title", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "",
          productIds: validProductId,
          tiers: validTiers,
        }),
      ),
    ).toThrow(Response);
  });

  it("rejects invalid product IDs", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "Test",
          productIds: "not-a-gid",
          tiers: validTiers,
        }),
      ),
    ).toThrow(Response);
  });

  it("rejects invalid tier JSON", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "Test",
          productIds: validProductId,
          tiers: "{bad",
        }),
      ),
    ).toThrow(Response);
  });

  it("rejects percentage discounts over 50%", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "Test",
          status: "active",
          productIds: validProductId,
          tiers: JSON.stringify([
            { minQty: 2, discountType: "percentage", discountValue: 100 },
          ]),
        }),
      ),
    ).toThrow(Response);
  });

  it("rejects invalid status values", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "Test",
          status: "live",
          productIds: validProductId,
          tiers: validTiers,
        }),
      ),
    ).toThrow(Response);
  });

  it("accepts a catalog-wide offer with allProducts", () => {
    const result = parseOfferForm(
      form({
        title: "Storewide",
        status: "active",
        allProducts: "true",
        tiers: validTiers,
      }),
    );

    expect(result.productIds).toEqual([]);
    expect(isCatalogOffer(result.productIds)).toBe(true);
  });

  it("rejects an offer with no products and no allProducts flag", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "Test",
          status: "active",
          tiers: validTiers,
        }),
      ),
    ).toThrow(Response);
  });

  it("accepts a buy-one-get-one-free offer", () => {
    const result = parseOfferForm(
      form({
        title: "BOGO",
        status: "active",
        offerType: "bogo",
        allProducts: "true",
        tiers: JSON.stringify([
          { minQty: 1, getQty: 1, discountType: "percentage", discountValue: 100 },
        ]),
      }),
    );

    expect(result.offerType).toBe("bogo");
    expect(result.tiers).toEqual([
      {
        minQty: 1,
        getQty: 1,
        discountType: "percentage",
        discountValue: 100,
        label: "Buy 1 get 1 free",
      },
    ]);
  });

  it("rejects BOGO buy quantity of 0", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "BOGO",
          status: "active",
          offerType: "bogo",
          allProducts: "true",
          tiers: JSON.stringify([{ minQty: 0, getQty: 1 }]),
        }),
      ),
    ).toThrow(Response);
  });

  it("still rejects unknown offer types", () => {
    expect(() =>
      parseOfferForm(
        form({
          title: "Test",
          status: "active",
          offerType: "free_gift",
          allProducts: "true",
          tiers: validTiers,
        }),
      ),
    ).toThrow(Response);
  });
});

describe("offerDiscountSummary", () => {
  it("summarizes BOGO deals", () => {
    expect(
      offerDiscountSummary({
        offerType: "bogo",
        tiers: [
          {
            minQty: 1,
            getQty: 1,
            discountType: "percentage",
            discountValue: 100,
          },
        ],
      }),
    ).toBe("Buy 1 get 1 free");
  });
});

describe("selectStorefrontBadges", () => {
  const qb = {
    offerType: "quantity_break",
    productIds: [] as string[],
    tiers: [
      { minQty: 2, discountType: "percentage" as const, discountValue: 10 },
      { minQty: 3, discountType: "percentage" as const, discountValue: 15 },
    ],
  };
  const bogo = {
    offerType: "bogo",
    productIds: [] as string[],
    tiers: [
      {
        minQty: 1,
        getQty: 1,
        discountType: "percentage" as const,
        discountValue: 100,
      },
    ],
  };

  it("emits a catalog badge for all-products BOGO", () => {
    const { catalog, byProductId } = selectStorefrontBadges([bogo]);
    expect(byProductId.size).toBe(0);
    expect(catalog).toMatchObject({
      offerType: "bogo",
      minQty: 1,
      getQty: 1,
    });
  });

  it("prefers BOGO copy over a catalog quantity-break", () => {
    const { catalog } = selectStorefrontBadges([qb, bogo]);
    expect(catalog?.offerType).toBe("bogo");
    expect(catalog?.getQty).toBe(1);
  });

  it("lets a product-specific BOGO override a catalog quantity-break", () => {
    const { catalog, byProductId } = selectStorefrontBadges([
      qb,
      { ...bogo, productIds: ["gid://shopify/Product/1"] },
    ]);
    expect(catalog?.offerType).toBe("quantity_break");
    expect(byProductId.get("gid://shopify/Product/1")?.offerType).toBe("bogo");
  });
});

describe("storefront preview", () => {
  it("builds quantity-break overlay copy and sample prices", () => {
    const model = storefrontPreviewModel({
      offerType: "quantity_break",
      title: "Buy more, save more",
      tiers: [
        { minQty: 2, discountType: "percentage", discountValue: 10, label: "Save 10%" },
        { minQty: 3, discountType: "percentage", discountValue: 15, label: "Save 15%" },
      ],
    });

    expect(storefrontBadgeText({
      offerType: "quantity_break",
      tiers: model.rows.length
        ? [
            { minQty: 2, discountType: "percentage", discountValue: 10 },
            { minQty: 3, discountType: "percentage", discountValue: 15 },
          ]
        : [],
    })).toBe("Buy 2, save 10%");
    expect(model.overlay).toBe("Buy 2, save 10%");
    expect(model.rows[0]).toMatchObject({
      label: "Buy 2",
      badge: "Save 10%",
      unitPriceLabel: "$36.00 each",
      defaultSelected: false,
    });
  });

  it("preselects a BOGO row and uses Free as the badge", () => {
    const model = storefrontPreviewModel({
      offerType: "bogo",
      title: "Buy 1 get 1 free",
      tiers: [
        {
          minQty: 1,
          getQty: 1,
          discountType: "percentage",
          discountValue: 100,
        },
      ],
    });

    expect(model.overlay).toBe("Buy 1 get 1 free");
    expect(model.rows[0]).toMatchObject({
      label: "Buy 1 get 1 free",
      badge: "Free",
      unitPriceLabel: "$20.00 each",
      defaultSelected: true,
    });
  });
});
