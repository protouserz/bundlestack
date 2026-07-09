import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { BogoConfig, PromotionRecord } from "./promotion.types";
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

function bogoMetafieldValue(promotion: PromotionRecord): string {
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

async function createBogoAppDiscount(
  admin: AdminApiContext,
  promotion: PromotionRecord,
): Promise<string> {
  const startsAt = new Date().toISOString();
  const title = `BundleStack BOGO · ${promotion.id} · ${promotion.title}`.slice(
    0,
    255,
  );

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
          title,
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
              value: bogoMetafieldValue(promotion),
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
 * Sync promotions to Shopify discounts.
 * BOGO uses the BundleStack Discount Function; other types remain pending.
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

  if (promotion.promotionType === "bogo") {
    if (promotion.productIds.length === 0) {
      throw new Error("Select at least one product for an active BOGO offer");
    }
    const discountId = await createBogoAppDiscount(admin, promotion);
    return [discountId];
  }

  console.info(
    JSON.stringify({
      event: "promotion_sync_pending",
      promotionType: promotion.promotionType,
      promotionId: promotion.id,
      shop: promotion.shop,
      message:
        "Promotion saved. Shopify Functions sync for this offer type is not implemented yet.",
    }),
  );

  return [];
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
