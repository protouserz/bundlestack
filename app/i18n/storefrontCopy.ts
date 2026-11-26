import {
  DEFAULT_BOGO_TITLE,
  DEFAULT_OFFER_TITLE,
  isBogoOffer,
  type DiscountTier,
} from "../models/offer";
import type { MessageKey } from "./index";

type Translate = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

export function isDefaultWidgetHeading(heading?: string) {
  const value = (heading || "").trim();
  return !value || /^buy more, save more$/i.test(value);
}

export function isSeededTierLabel(label?: string) {
  const value = (label || "").trim();
  if (!value) return true;
  return (
    /^save\s/i.test(value) || /^buy\s+\d+\s+get\s+\d+\s+free$/i.test(value)
  );
}

export function widgetHeadingCopy(
  heading: string | undefined,
  t: Translate,
) {
  if (isDefaultWidgetHeading(heading) || heading === DEFAULT_OFFER_TITLE) {
    return t("storefront.heading");
  }
  if (heading === DEFAULT_BOGO_TITLE) {
    return t("storefront.buyGetFree", { buy: 1, get: 1 });
  }
  return heading;
}

export function tierLabelCopy(
  tier: DiscountTier,
  offerType: string,
  t: Translate,
) {
  const isBogo = isBogoOffer(offerType) || Number(tier.getQty) > 0;
  if (isBogo) {
    if (tier.label && !isSeededTierLabel(tier.label)) return tier.label;
    return t("storefront.buyGetFree", {
      buy: tier.minQty,
      get: tier.getQty ?? 1,
    });
  }
  if (tier.label && !isSeededTierLabel(tier.label)) return tier.label;
  return t("storefront.buy", { qty: tier.minQty });
}

export function tierBadgeCopy(
  tier: DiscountTier,
  offerType: string,
  t: Translate,
) {
  if (isBogoOffer(offerType) || Number(tier.getQty) > 0) {
    return t("storefront.free");
  }
  return tier.discountType === "percentage"
    ? t("storefront.savePercent", { value: tier.discountValue })
    : t("storefront.saveAmount", { value: `$${tier.discountValue}` });
}

export function overlayCopy(
  offer: { offerType: string; tiers: DiscountTier[] },
  t: Translate,
) {
  const starting = [...offer.tiers].sort((a, b) => a.minQty - b.minQty)[0];
  if (!starting?.minQty) return t("storefront.heading");
  if (isBogoOffer(offer.offerType) || Number(starting.getQty) > 0) {
    return t("storefront.buyGetFree", {
      buy: starting.minQty,
      get: starting.getQty ?? 1,
    });
  }
  const saving =
    starting.discountType === "percentage"
      ? `${starting.discountValue}%`
      : `$${starting.discountValue}`;
  return t("storefront.buySave", { qty: starting.minQty, saving });
}
