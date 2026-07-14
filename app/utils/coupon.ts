import type {
  CouponAppliesTo,
  CouponDiscountType,
} from "../models/coupon.types";

export function formatCouponValue(coupon: {
  discountType: CouponDiscountType;
  discountValue: number;
}) {
  return coupon.discountType === "percentage"
    ? `${coupon.discountValue}% off`
    : `$${coupon.discountValue.toFixed(2)} off`;
}

export function formatCouponScope(coupon: {
  appliesTo: CouponAppliesTo;
  productIds: string[];
  excludedProductIds: string[];
}) {
  if (coupon.appliesTo === "products") {
    const count = coupon.productIds.length;
    return `${count} product${count === 1 ? "" : "s"}`;
  }
  const excluded = coupon.excludedProductIds.length;
  if (excluded === 0) return "Entire store";
  return `Entire store · ${excluded} excluded`;
}
