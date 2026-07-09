export type CouponDiscountType = "percentage" | "fixed";

export type CouponRecord = {
  id: string;
  shop: string;
  title: string;
  code: string;
  status: string;
  discountType: CouponDiscountType;
  discountValue: number;
  appliesOncePerCustomer: boolean;
  usageLimit: number | null;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  discountId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};
