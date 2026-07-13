import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type {
  BogoConfig,
  BundleBuilderConfig,
  FbtConfig,
  FreeGiftConfig,
  MixMatchConfig,
  PromotionRecord,
  PromotionType,
} from "./promotion.types";
import { deleteShopifyDiscounts } from "./discount.server";

type GraphqlResponse = {
  errors?: Array<{ message: string }>;
  data?: Record<string, unknown>;
};

const FUNCTION_HANDLE = "bundlestack-discount";

function assertGraphqlOk(json: GraphqlResponse, context: string) {
  if (json.errors?.length) {
    throw new Error(
      `${context}: ${json.errors.map((error) => error.message).join(", ")}`,
    );
  }
}

export function metafieldValueForPromotion(promotion: PromotionRecord): string {
  switch (promotion.promotionType) {
    case "bogo": {
      const config = promotion.config as BogoConfig;
      return JSON.stringify({
        type: "bogo",
        buyQuantity: config.buyQuantity,
        getQuantity: config.getQuantity,
        getDiscountType: config.getDiscountType,
        getDiscountValue: config.getDiscountValue,
        sameProduct: config.sameProduct,
        productIds: promotion.productIds,
        getProductIds: config.getProductIds ?? [],
      });
    }
    case "free_gift": {
      const config = promotion.config as FreeGiftConfig;
      return JSON.stringify({
        type: "free_gift",
        minSubtotal: config.minSubtotal,
        minQuantity: config.minQuantity,
        giftProductIds: config.giftProductIds ?? [],
        giftQuantity: config.giftQuantity,
        productIds: promotion.productIds,
      });
    }
    case "mix_match": {
      const config = promotion.config as MixMatchConfig;
      return JSON.stringify({
        type: "mix_match",
        minItems: config.minItems,
        discountType: config.discountType,
        discountValue: config.discountValue,
        productIds: promotion.productIds,
      });
    }
    case "bundle_builder": {
      const config = promotion.config as BundleBuilderConfig;
      const steps = (config.steps ?? []).map((step, index) => ({
        ...step,
        productIds:
          step.productIds?.length > 0
            ? step.productIds
            : index === 0
              ? promotion.productIds
              : step.productIds ?? [],
      }));
      return JSON.stringify({
        type: "bundle_builder",
        steps,
        discountType: config.discountType,
        discountValue: config.discountValue,
        minStepsCompleted: config.minStepsCompleted,
        productIds: promotion.productIds,
      });
    }
    case "fbt": {
      const config = promotion.config as FbtConfig;
      return JSON.stringify({
        type: "fbt",
        anchorProductIds:
          config.anchorProductIds?.length > 0
            ? config.anchorProductIds
            : promotion.productIds,
        recommendedProductIds: config.recommendedProductIds ?? [],
        discountType: config.discountType,
        discountValue: config.discountValue,
        requireAll: config.requireAll,
        productIds: promotion.productIds,
      });
    }
    default: {
      const exhaustive: never = promotion.promotionType;
      throw new Error(`Unsupported promotion type: ${exhaustive}`);
    }
  }
}

function validateActivePromotion(promotion: PromotionRecord) {
  switch (promotion.promotionType) {
    case "bogo":
      if (promotion.productIds.length === 0) {
        throw new Error("Select at least one product for an active BOGO offer");
      }
      break;
    case "free_gift": {
      const config = promotion.config as FreeGiftConfig;
      if ((config.giftProductIds ?? []).length === 0) {
        throw new Error("Select at least one gift product for an active free-gift offer");
      }
      break;
    }
    case "mix_match":
      if (promotion.productIds.length === 0) {
        throw new Error("Select at least one product for an active mix & match offer");
      }
      break;
    case "bundle_builder": {
      const config = promotion.config as BundleBuilderConfig;
      if ((config.steps ?? []).length === 0) {
        throw new Error("Add at least one builder step for an active bundle builder");
      }
      break;
    }
    case "fbt": {
      const config = promotion.config as FbtConfig;
      const anchors =
        config.anchorProductIds?.length > 0
          ? config.anchorProductIds
          : promotion.productIds;
      if (anchors.length === 0) {
        throw new Error("Select at least one anchor product for an active FBT offer");
      }
      if ((config.recommendedProductIds ?? []).length === 0) {
        throw new Error(
          "Select at least one recommended product for an active FBT offer",
        );
      }
      break;
    }
    default: {
      const exhaustive: never = promotion.promotionType;
      throw new Error(`Unsupported promotion type: ${exhaustive}`);
    }
  }
}

function titleFor(promotion: PromotionRecord): string {
  const labels: Record<PromotionType, string> = {
    bogo: "BOGO",
    free_gift: "Gift",
    mix_match: "Mix",
    bundle_builder: "Builder",
    fbt: "FBT",
  };
  return `BundleStack ${labels[promotion.promotionType]} · ${promotion.id} · ${promotion.title}`.slice(
    0,
    255,
  );
}

async function createAppDiscount(
  admin: AdminApiContext,
  promotion: PromotionRecord,
): Promise<string> {
  const startsAt = new Date().toISOString();

  const response = await admin.graphql(
    `#graphql
      mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount {
            discountId
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        automaticAppDiscount: {
          title: titleFor(promotion),
          functionHandle: FUNCTION_HANDLE,
          startsAt,
          discountClasses: ["PRODUCT"],
          combinesWith: {
            orderDiscounts: true,
            productDiscounts: true,
            shippingDiscounts: true,
          },
          metafields: [
            {
              namespace: "$app",
              key: "function-configuration",
              type: "json",
              value: metafieldValueForPromotion(promotion),
            },
          ],
        },
      },
    },
  );

  const json = (await response.json()) as GraphqlResponse;
  assertGraphqlOk(json, "discountAutomaticAppCreate");

  const payload = json.data?.discountAutomaticAppCreate as
    | {
        automaticAppDiscount?: { discountId?: string };
        userErrors?: Array<{ message: string }>;
      }
    | undefined;

  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  const discountId = payload?.automaticAppDiscount?.discountId;
  if (!discountId) {
    throw new Error("discountAutomaticAppCreate did not return a discount ID");
  }

  return discountId;
}

/**
 * Sync promotions to Shopify Discount Function metafields.
 */
export async function applyPromotionDiscountSync(
  admin: AdminApiContext,
  promotion: PromotionRecord,
  existingDiscountIds: string[],
): Promise<string[]> {
  if (existingDiscountIds.length > 0) {
    await deleteShopifyDiscounts(admin, existingDiscountIds);
  }

  if (promotion.status !== "active") {
    return [];
  }

  validateActivePromotion(promotion);
  const discountId = await createAppDiscount(admin, promotion);
  return [discountId];
}

export async function cleanupAllShopPromotionDiscounts(
  admin: AdminApiContext,
  shop: string,
) {
  const { listPromotions } = await import("./promotion.server");
  const promotions = await listPromotions(shop);
  const ids = promotions.flatMap((promotion) => promotion.discountIds);
  await deleteShopifyDiscounts(admin, ids);
}
