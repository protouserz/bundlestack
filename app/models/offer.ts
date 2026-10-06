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

export type WidgetLook = {
  heading: string;
  matchTheme: boolean;
  accent: string;
  background: string;
  textColor: string;
  selectedBackground: string;
};

export type BundleOfferInput = {
  title: string;
  offerType?: string;
  status?: string;
  productIds: string[];
  tiers: DiscountTier[];
  widgetLook?: WidgetLook;
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

/** Admin/preview fallbacks when the widget inherits the live store theme. */
const THEME_LOOK_FALLBACK = {
  accent: "#121212",
  background: "#ffffff",
  textColor: "#121212",
  selectedBackground: "#f3f3f3",
};

export const CUSTOM_EMERALD_LOOK: WidgetLook = {
  heading: "Buy more, save more",
  matchTheme: false,
  accent: "#059669",
  background: "#ffffff",
  textColor: "#0f172a",
  selectedBackground: "#ecfdf5",
};

export const DEFAULT_WIDGET_LOOK: WidgetLook = {
  heading: "Buy more, save more",
  matchTheme: true,
  ...THEME_LOOK_FALLBACK,
};

export const WIDGET_LOOK_PRESETS: { id: string; label: string; look: WidgetLook }[] = [
  { id: "theme", label: "Match theme", look: DEFAULT_WIDGET_LOOK },
  { id: "emerald", label: "Emerald", look: CUSTOM_EMERALD_LOOK },
  {
    id: "navy",
    label: "Navy and gold",
    look: {
      heading: "Buy more, save more",
      matchTheme: false,
      accent: "#c9a227",
      background: "#f8fafc",
      textColor: "#0b1b3a",
      selectedBackground: "#fff7d6",
    },
  },
  {
    id: "rose",
    label: "Rose and cream",
    look: {
      heading: "Buy more, save more",
      matchTheme: false,
      accent: "#be123c",
      background: "#fff7f4",
      textColor: "#4a1025",
      selectedBackground: "#ffe4e6",
    },
  },
  {
    id: "dark",
    label: "Dark",
    look: {
      heading: "Buy more, save more",
      matchTheme: false,
      accent: "#34d399",
      background: "#111827",
      textColor: "#f8fafc",
      selectedBackground: "#064e3b",
    },
  },
];

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return fallback;
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function hasCustomHex(data: Record<string, unknown>) {
  return (
    HEX_COLOR.test(String(data.accent ?? "").trim()) ||
    HEX_COLOR.test(String(data.background ?? "").trim()) ||
    HEX_COLOR.test(String(data.textColor ?? "").trim()) ||
    HEX_COLOR.test(String(data.selectedBackground ?? "").trim())
  );
}

function parseMatchTheme(data: Record<string, unknown>) {
  const raw = data.matchTheme;
  if (raw === true || raw === "true" || raw === "1") return true;
  if (raw === false || raw === "false" || raw === "0") return false;
  return !hasCustomHex(data);
}

export function isThemeLook(look: WidgetLook | null | undefined) {
  return Boolean(look?.matchTheme);
}

export function parseWidgetLook(raw: unknown): WidgetLook {
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const heading =
    typeof data.heading === "string" && data.heading.trim()
      ? data.heading.trim().slice(0, 80)
      : DEFAULT_WIDGET_LOOK.heading;
  const matchTheme = parseMatchTheme(data);
  const fallback = matchTheme ? DEFAULT_WIDGET_LOOK : CUSTOM_EMERALD_LOOK;

  return {
    heading,
    matchTheme,
    accent: normalizeHex(data.accent, fallback.accent),
    background: normalizeHex(data.background, fallback.background),
    textColor: normalizeHex(data.textColor, fallback.textColor),
    selectedBackground: normalizeHex(
      data.selectedBackground,
      fallback.selectedBackground,
    ),
  };
}

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

export const PREVIEW_EXAMPLE_AMOUNT = 40;
export const PREVIEW_EXAMPLE_CENTS = 4000;

export type StorefrontPreviewProduct = {
  title: string;
  handle: string;
  imageUrl?: string;
  imageAlt?: string;
  exampleAmount: number;
  currencyCode: string;
  storefrontUrl?: string;
};

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

function formatPreviewMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
}

export type StorefrontPreviewOptions = {
  exampleAmount?: number;
  currencyCode?: string;
};

/** Admin mock of the product-page widget, using sample or live product pricing. */
export function storefrontPreviewModel(
  offer?: {
    offerType: string;
    title?: string;
    tiers: DiscountTier[];
  } | null,
  options: StorefrontPreviewOptions = {},
) {
  const exampleAmount =
    options.exampleAmount && options.exampleAmount > 0
      ? options.exampleAmount
      : PREVIEW_EXAMPLE_AMOUNT;
  const currencyCode = options.currencyCode?.trim() || "USD";
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
    const unitAmount = isBogo
      ? exampleAmount * (1 - getQty / cartQty)
      : tier.discountType === "percentage"
        ? exampleAmount * (1 - tier.discountValue / 100)
        : Math.max(0, exampleAmount - tier.discountValue / minQty);
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
      unitPriceLabel: `${formatPreviewMoney(unitAmount, currencyCode)} each`,
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
