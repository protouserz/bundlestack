import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";
import {
  getCouponByCode,
  removeCouponRecord,
  type CouponInput,
} from "./coupon.server";
import {
  cleanupCouponShopifyResources,
  findShopifyDiscountByCode,
  deleteShopifyDiscountCodes,
} from "./discount-code.server";

export type CouponCodeOverwrite = {
  code: string;
  message: string;
};

export async function findCouponCodeConflict(
  admin: AdminApiContext,
  shop: string,
  code: string,
  options?: {
    /** Current coupon id (edit) — ignored when matching DB. */
    excludeCouponId?: string;
    /** Current Shopify discount id (edit) — ignored when matching Shopify. */
    excludeDiscountId?: string | null;
  },
): Promise<CouponCodeOverwrite | null> {
  const existing = await getCouponByCode(shop, code);
  if (existing && existing.id !== options?.excludeCouponId) {
    return {
      code,
      message: `A BundleStack coupon already uses code "${code}" (${existing.title}). Replace it with this one? The existing coupon and its Shopify discount will be deleted.`,
    };
  }

  const shopifyDiscount = await findShopifyDiscountByCode(admin, code);
  if (
    shopifyDiscount &&
    shopifyDiscount.id !== options?.excludeDiscountId
  ) {
    const title = shopifyDiscount.title
      ? ` ("${shopifyDiscount.title}")`
      : "";
    return {
      code,
      message: `Shopify already has a discount with code "${code}"${title}. Replace it with this coupon? The existing Shopify discount will be deleted.`,
    };
  }

  return null;
}

/** Delete BundleStack + Shopify resources that currently own this code. */
export async function clearCouponCodeOwners(
  admin: AdminApiContext,
  shop: string,
  code: string,
  options?: {
    excludeCouponId?: string;
    excludeDiscountId?: string | null;
  },
) {
  const existing = await getCouponByCode(shop, code);
  if (existing && existing.id !== options?.excludeCouponId) {
    await cleanupCouponShopifyResources(admin, existing);
    await removeCouponRecord(existing.id, shop);
  }

  const shopifyDiscount = await findShopifyDiscountByCode(admin, code);
  if (
    shopifyDiscount &&
    shopifyDiscount.id !== options?.excludeDiscountId
  ) {
    await deleteShopifyDiscountCodes(admin, [shopifyDiscount.id]);
  }
}

export function couponOverwriteFromUniqueError(
  code: string,
  message: string,
): CouponCodeOverwrite {
  return {
    code,
    message:
      message.includes("Replace")
        ? message
        : `Code "${code}" is already in use. Replace the existing coupon/discount with this one? This cannot be undone.`,
  };
}

export type { CouponInput };
