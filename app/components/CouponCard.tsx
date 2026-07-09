import { Link, useSubmit } from "react-router";
import type { listCoupons } from "../models/coupon.server";
import { formatCouponValue } from "../models/coupon.server";
import { SButton } from "./polaris";

type Coupon = Awaited<ReturnType<typeof listCoupons>>[number];

type CouponCardProps = {
  coupon: Coupon;
  showDelete?: boolean;
};

export function CouponCard({ coupon, showDelete = false }: CouponCardProps) {
  const submit = useSubmit();

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${coupon.title}" (${coupon.code})? The synced Shopify discount code will be removed.`,
    );
    if (!confirmed) return;

    void submit(
      { intent: "delete", couponId: coupon.id },
      { method: "post" },
    );
  };

  return (
    <s-box padding="large" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base">
          <s-heading>{coupon.title}</s-heading>
          <s-badge tone={coupon.status === "active" ? "success" : "info"}>
            {coupon.status}
          </s-badge>
        </s-stack>

        <s-text tone="neutral">
          Code <strong>{coupon.code}</strong> · {formatCouponValue(coupon)}
          {coupon.discountId ? " · synced to Shopify" : " · not synced"}
        </s-text>

        <s-stack direction="inline" gap="base">
          <Link to={`/app/coupons/${coupon.id}`}>Edit coupon</Link>
          {showDelete ? (
            <SButton
              type="button"
              tone="critical"
              variant="tertiary"
              onClick={handleDelete}
            >
              Delete
            </SButton>
          ) : null}
        </s-stack>
      </s-stack>
    </s-box>
  );
}
