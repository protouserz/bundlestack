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

export const PREVIEW_EXAMPLE_CENTS = 4000;

export function storefrontBadgeText(offer: {
  offerType: string;
  tiers: DiscountTier[];
}) {
  const starting = [...offer.tiers].sort((a, b) => a.minQty - b.minQty)[0];
  if (!starting?.minQty) return "Buy more, save more";

  if (isBogoOffer(offer.offerType) || Number(starting.getQty) > 0) {
    return bogoLabel(starting.minQty, starting.getQty ?? 1);
  }

  const saving =
    starting.discountType === "percentage"
      ? `${starting.discountValue}%`
      : `$${starting.discountValue}`;
  return `Buy ${starting.minQty}, save ${saving}`;
}

export type StorefrontPreviewRow = {
  key: string;
  label: string;
  badge: string;
  unitPriceLabel: string;
  defaultSelected: boolean;
};

function formatPreviewMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Admin mock of the product-page widget, using sample pricing. */
export function storefrontPreviewModel(
  offer?: {
    offerType: string;
    title?: string;
    tiers: DiscountTier[];
  } | null,
  exampleCents = PREVIEW_EXAMPLE_CENTS,
) {
  const source =
    offer?.tiers?.length
      ? offer
      : {
          offerType: OFFER_TYPE_QUANTITY_BREAK,
          title: DEFAULT_OFFER_TITLE,
          tiers: DEFAULT_QUANTITY_TIERS,
        };

  const rows: StorefrontPreviewRow[] = source.tiers.map((tier, index) => {
    const minQty = Math.max(1, Math.floor(Number(tier.minQty)) || 1);
    const getQty = Math.max(1, Math.floor(Number(tier.getQty)) || 1);
    const isBogo = isBogoOffer(source.offerType) || Number(tier.getQty) > 0;
    const cartQty = isBogo ? minQty + getQty : minQty;
    const unitCents = isBogo
      ? Math.round(exampleCents * (1 - getQty / cartQty))
      : tier.discountType === "percentage"
        ? Math.round(exampleCents * (1 - tier.discountValue / 100))
        : Math.max(
            0,
            exampleCents - Math.round((tier.discountValue * 100) / minQty),
          );
    const customLabel = tier.label?.trim() ?? "";
    const label = isBogo
      ? bogoLabel(minQty, getQty)
      : customLabel && !/^save\s/i.test(customLabel)
        ? customLabel
        : `Buy ${minQty}`;

    return {
      key: `${minQty}-${getQty}-${index}`,
      label,
      badge: isBogo
        ? "Free"
        : tier.discountType === "percentage"
          ? `Save ${tier.discountValue}%`
          : `Save $${tier.discountValue}`,
      unitPriceLabel: `${formatPreviewMoney(unitCents)} each`,
      defaultSelected: isBogo && index === 0,
    };
  });

  return {
    title: isBogoOffer(source.offerType)
      ? source.title?.trim() || DEFAULT_BOGO_TITLE
      : DEFAULT_OFFER_TITLE,
    overlay: storefrontBadgeText(source),
    rows,
  };
}
