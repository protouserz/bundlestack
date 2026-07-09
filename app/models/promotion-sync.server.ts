import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import type { PromotionRecord } from "./promotion.types";
import { deleteShopifyDiscounts } from "./discount.server";

/**
 * Sync promotions to Shopify discounts.
 *
 * Phase 1: persist config + clear discounts when paused/draft.
 * Phase 2 (follow-up): Shopify Functions / BXGY / automatic discounts per type.
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

  // Placeholder: type-specific Shopify Function / BXGY sync lands next.
  // Returning [] keeps the offer active in-app without creating incomplete discounts.
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
