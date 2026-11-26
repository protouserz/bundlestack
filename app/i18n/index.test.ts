import { describe, expect, it } from "vitest";
import { interpolate, negotiateLocale, t } from "./index";

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
    expect(t("es", "storefront.buyGetFree", { buy: 1, get: 1 })).toBe(
      "Compra 1 y llévate 1 gratis",
    );
  });

  it("falls back to English when a key is missing", () => {
    expect(t("lt", "offers.dangerBody")).toMatch(/Permanently delete/);
  });
});
