import { useSubmit } from "react-router";
import type { CouponRecord } from "../models/coupon.types";
import { formatCouponValue } from "../utils/coupon";
import { SButton } from "./polaris";
import styles from "./promotions/promotions.module.css";

type CouponCardProps = {
  coupon: CouponRecord;
  showDelete?: boolean;
};

export function CouponCard({ coupon, showDelete = false }: CouponCardProps) {
  const submit = useSubmit();
  const live = coupon.status === "active";

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
    <article className={styles.row}>
      <div>
        <div className={styles.rowTitleRow}>
          <h3 className={styles.rowTitle}>{coupon.title}</h3>
          <span className={live ? styles.badgeLive : styles.badge}>
            {coupon.status}
          </span>
        </div>
        <p className={styles.rowMeta}>
          <span className={styles.ticket}>{coupon.code}</span>
          <span>{formatCouponValue(coupon)}</span>
          <span>
            {coupon.discountId ? "Synced to Shopify" : "Not synced yet"}
          </span>
        </p>
      </div>
      <div className={styles.rowActions}>
        <SButton variant="secondary" href={`/app/coupons/${coupon.id}`}>
          Edit
        </SButton>
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
      </div>
    </article>
  );
}
