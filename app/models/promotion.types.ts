export const PROMOTION_TYPES = [
  "bogo",
  "free_gift",
  "mix_match",
  "bundle_builder",
  "fbt",
] as const;

export type PromotionType = (typeof PROMOTION_TYPES)[number];

export type PromotionStatus = "draft" | "active" | "paused";

export type DiscountValueType = "percentage" | "fixed" | "free";

export type BogoConfig = {
  buyQuantity: number;
  getQuantity: number;
  getDiscountType: DiscountValueType;
  getDiscountValue: number;
  sameProduct: boolean;
  getProductIds: string[];
};

export type FreeGiftConfig = {
  minSubtotal: number | null;
  minQuantity: number | null;
  giftProductIds: string[];
  giftQuantity: number;
  autoAdd: boolean;
};

export type MixMatchConfig = {
  minItems: number;
  discountType: Exclude<DiscountValueType, "free">;
  discountValue: number;
  allowCollections: boolean;
};

export type BundleBuilderStep = {
  id: string;
  title: string;
  minSelect: number;
  maxSelect: number;
  productIds: string[];
};

export type BundleBuilderConfig = {
  steps: BundleBuilderStep[];
  discountType: Exclude<DiscountValueType, "free">;
  discountValue: number;
  minStepsCompleted: number;
};

export type FbtConfig = {
  anchorProductIds: string[];
  recommendedProductIds: string[];
  discountType: Exclude<DiscountValueType, "free">;
  discountValue: number;
  requireAll: boolean;
  headline: string;
};

export type PromotionConfigMap = {
  bogo: BogoConfig;
  free_gift: FreeGiftConfig;
  mix_match: MixMatchConfig;
  bundle_builder: BundleBuilderConfig;
  fbt: FbtConfig;
};

export type PromotionRecord = {
  id: string;
  shop: string;
  title: string;
  promotionType: PromotionType;
  status: string;
  config: PromotionConfigMap[PromotionType];
  productIds: string[];
  collectionIds: string[];
  discountIds: string[];
  discountUses: number;
  revenueGenerated: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export const PROMOTION_TYPE_META: Record<
  PromotionType,
  { label: string; shortLabel: string; description: string; href: string }
> = {
  bogo: {
    label: "BOGO",
    shortLabel: "BOGO",
    description: "Buy X get Y free or discounted — classic volume upsell.",
    href: "/app/promotions/bogo",
  },
  free_gift: {
    label: "Free gifts",
    shortLabel: "Gifts",
    description: "Reward carts that hit a spend or quantity threshold with a free product.",
    href: "/app/promotions/free-gifts",
  },
  mix_match: {
    label: "Mix & match",
    shortLabel: "Mix",
    description: "Let shoppers pick any N items from a set and unlock a discount.",
    href: "/app/promotions/mix-match",
  },
  bundle_builder: {
    label: "Bundle builder",
    shortLabel: "Builder",
    description: "Guided multi-step kits (pick base, add-ons, extras) with a bundle price.",
    href: "/app/promotions/builders",
  },
  fbt: {
    label: "Frequently bought together",
    shortLabel: "FBT",
    description: "Product-page upsells that discount complementary items bought together.",
    href: "/app/promotions/fbt",
  },
};

export function defaultConfigForType(type: PromotionType): PromotionConfigMap[PromotionType] {
  switch (type) {
    case "bogo":
      return {
        buyQuantity: 1,
        getQuantity: 1,
        getDiscountType: "free",
        getDiscountValue: 100,
        sameProduct: true,
        getProductIds: [],
      };
    case "free_gift":
      return {
        minSubtotal: 50,
        minQuantity: null,
        giftProductIds: [],
        giftQuantity: 1,
        autoAdd: false,
      };
    case "mix_match":
      return {
        minItems: 3,
        discountType: "percentage",
        discountValue: 15,
        allowCollections: true,
      };
    case "bundle_builder":
      return {
        steps: [
          {
            id: "step-1",
            title: "Choose your base",
            minSelect: 1,
            maxSelect: 1,
            productIds: [],
          },
          {
            id: "step-2",
            title: "Add extras",
            minSelect: 1,
            maxSelect: 3,
            productIds: [],
          },
        ],
        discountType: "percentage",
        discountValue: 10,
        minStepsCompleted: 2,
      };
    case "fbt":
      return {
        anchorProductIds: [],
        recommendedProductIds: [],
        discountType: "percentage",
        discountValue: 10,
        requireAll: true,
        headline: "Frequently bought together",
      };
  }
}

export function summarizePromotionConfig(
  type: PromotionType,
  config: PromotionConfigMap[PromotionType],
): string {
  switch (type) {
    case "bogo": {
      const c = config as BogoConfig;
      const deal =
        c.getDiscountType === "free"
          ? "free"
          : c.getDiscountType === "percentage"
            ? `${c.getDiscountValue}% off`
            : `$${c.getDiscountValue} off`;
      return `Buy ${c.buyQuantity}, get ${c.getQuantity} ${deal}`;
    }
    case "free_gift": {
      const c = config as FreeGiftConfig;
      if (c.minSubtotal != null) return `Free gift over $${c.minSubtotal}`;
      if (c.minQuantity != null) return `Free gift at ${c.minQuantity}+ items`;
      return "Free gift offer";
    }
    case "mix_match": {
      const c = config as MixMatchConfig;
      return `Any ${c.minItems}+ · ${c.discountValue}${c.discountType === "percentage" ? "%" : "$"} off`;
    }
    case "bundle_builder": {
      const c = config as BundleBuilderConfig;
      return `${c.steps.length} steps · ${c.discountValue}${c.discountType === "percentage" ? "%" : "$"} off`;
    }
    case "fbt": {
      const c = config as FbtConfig;
      return `${c.recommendedProductIds.length} upsell(s) · ${c.discountValue}${c.discountType === "percentage" ? "%" : "$"} off`;
    }
  }
}
