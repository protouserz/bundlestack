import type { CouponDiscountType } from "../models/coupon.types";

export function formatCouponValue(coupon: {
  discountType: CouponDiscountType;
  discountValue: number;
}) {
  return coupon.discountType === "percentage"
    ? `${coupon.discountValue}% off`
    : `$${coupon.discountValue.toFixed(2)} off`;
}
