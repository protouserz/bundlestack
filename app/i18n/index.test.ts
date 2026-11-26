import { describe, expect, it } from "vitest";
import { interpolate, negotiateLocale, t } from "./index";
import {
  overlayCopy,
  tierBadgeCopy,
  tierLabelCopy,
  widgetHeadingCopy,
} from "./storefrontCopy";

describe("locale negotiation", () => {
  it("maps Shopify iframe locales onto listing languages", () => {
    expect(negotiateLocale("es")).toBe("es");
    expect(negotiateLocale("es-MX")).toBe("es");
    expect(negotiateLocale("zh-CN")).toBe("zh-CN");
    expect(negotiateLocale("zh_TW")).toBe("zh-TW");
    expect(negotiateLocale("pt-BR")).toBe("pt-BR");
    expect(negotiateLocale("pt-PT")).toBe("pt-PT");
    expect(negotiateLocale("nb")).toBe("nb");
    expect(negotiateLocale("no")).toBe("nb");
    expect(negotiateLocale("en")).toBe("en");
  });
});

describe("translate", () => {
  it("interpolates placeholders", () => {
    expect(interpolate("Buy {qty}", { qty: 2 })).toBe("Buy 2");
  });

  it("uses Spanish catalog strings for nav and storefront copy", () => {
    expect(t("es", "nav.offers")).toBe("Ofertas");
    expect(t("es", "storefront.heading")).toBe("Compra más, ahorra más");
    expect(t("es", "storefront.buyGetFree", { buy: 1, get: 1 })).toBe(
      "Compra 1 y llévate 1 gratis",
    );
  });

  it("translates default dashboard preview labels in Spanish", () => {
    const tes = (
      key: Parameters<typeof t>[1],
      vars?: Record<string, string | number>,
    ) => t("es", key, vars);
    const tiers = [
      { minQty: 2, discountType: "percentage" as const, discountValue: 10, label: "Save 10%" },
      { minQty: 3, discountType: "percentage" as const, discountValue: 15, label: "Save 15%" },
    ];

    expect(widgetHeadingCopy("Buy more, save more", tes)).toBe(
      "Compra más, ahorra más",
    );
    expect(overlayCopy({ offerType: "quantity_break", tiers }, tes)).toBe(
      "Compra 2, ahorra 10%",
    );
    expect(tierLabelCopy(tiers[0], "quantity_break", tes)).toBe("Compra 2");
    expect(tierBadgeCopy(tiers[0], "quantity_break", tes)).toBe("Ahorra 10%");
  });

  it("falls back to English when a key is missing", () => {
    expect(t("lt", "offers.dangerBody")).toMatch(/Permanently delete/);
  });
});
