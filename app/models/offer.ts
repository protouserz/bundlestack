export const OFFER_TYPE_QUANTITY_BREAK = "quantity_break";
export const OFFER_TYPE_BOGO = "bogo";
export const OFFER_TYPES = [
  OFFER_TYPE_QUANTITY_BREAK,
  OFFER_TYPE_BOGO,
] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

export type DiscountTier = {
  minQty: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  label?: string;
  /** BOGO only: number of units that are free (or 100% off). */
  getQty?: number;
};

export type BundleOfferInput = {
  title: string;
  offerType?: string;
  status?: string;
  productIds: string[];
  tiers: DiscountTier[];
};

export const DEFAULT_OFFER_TITLE = "Buy more, save more";
export const DEFAULT_BOGO_TITLE = "Buy 1 get 1 free";

export const DEFAULT_QUANTITY_TIERS: DiscountTier[] = [
  { minQty: 2, discountType: "percentage", discountValue: 10, label: "Save 10%" },
  { minQty: 3, discountType: "percentage", discountValue: 15, label: "Save 15%" },
];

export const DEFAULT_BOGO_TIERS: DiscountTier[] = [
  {
    minQty: 1,
    getQty: 1,
    discountType: "percentage",
    discountValue: 100,
    label: "Buy 1 get 1 free",
  },
];

export function isBogoOffer(offerType: string | undefined) {
  return offerType === OFFER_TYPE_BOGO;
}

export function isOfferType(value: string): value is OfferType {
  return (OFFER_TYPES as readonly string[]).includes(value);
}

export function bogoLabel(buyQty: number, getQty: number) {
  return `Buy ${buyQty} get ${getQty} free`;
}

export function offerDiscountSummary(offer: {
  offerType: string;
  tiers: DiscountTier[];
}) {
  if (isBogoOffer(offer.offerType)) {
    const tier = offer.tiers[0];
    return bogoLabel(tier?.minQty ?? 1, tier?.getQty ?? 1);
  }

  const topTier = [...offer.tiers].sort(
    (a, b) => b.discountValue - a.discountValue,
  )[0];
  if (!topTier) return "Quantity break";
  return topTier.discountType === "percentage"
    ? `Up to ${topTier.discountValue}% off`
    : `Up to $${topTier.discountValue} off`;
}

/** Empty product list means the offer applies to the whole catalog. */
export function isCatalogOffer(productIds: string[]) {
  return productIds.length === 0;
}
