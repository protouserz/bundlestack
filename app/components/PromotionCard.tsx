import { Link, useSubmit } from "react-router";
import type { PromotionRecord } from "../models/promotion.types";
import {
  PROMOTION_TYPE_META,
  summarizePromotionConfig,
} from "../models/promotion.types";
import { SButton } from "./polaris";
import { PromotionTypeMark } from "./promotions/PromotionTypeMark";
import styles from "./promotions/promotions.module.css";

type PromotionCardProps = {
  promotion: PromotionRecord;
  showDelete?: boolean;
};

export function PromotionCard({
  promotion,
  showDelete = false,
}: PromotionCardProps) {
  const submit = useSubmit();
  const meta = PROMOTION_TYPE_META[promotion.promotionType];
  const live = promotion.status === "active";

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Delete "${promotion.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    void submit(
      { intent: "delete", promotionId: promotion.id },
      { method: "post" },
    );
  };

  return (
    <article className={styles.row}>
      <div>
        <div className={styles.rowTitleRow}>
          <PromotionTypeMark type={promotion.promotionType} />
          <h3 className={styles.rowTitle}>{promotion.title}</h3>
          <span className={live ? styles.badgeLive : styles.badge}>
            {promotion.status}
          </span>
          <span className={styles.badge}>{meta.shortLabel}</span>
        </div>
        <p className={styles.rowMeta}>
          {summarizePromotionConfig(promotion.promotionType, promotion.config)}
          {promotion.discountIds.length > 0
            ? " · synced at checkout"
            : " · checkout sync pending"}
        </p>
      </div>
      <div className={styles.rowActions}>
        <SButton variant="secondary" href={`${meta.href}/${promotion.id}`}>
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
