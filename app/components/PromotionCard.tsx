import { Link, useSubmit } from "react-router";
import type { PromotionRecord } from "../models/promotion.types";
import {
  PROMOTION_TYPE_META,
  summarizePromotionConfig,
} from "../models/promotion.types";
import { SButton } from "./polaris";

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
    <s-box padding="large" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base">
          <s-heading>{promotion.title}</s-heading>
          <s-badge tone={promotion.status === "active" ? "success" : "info"}>
            {promotion.status}
          </s-badge>
          <s-badge>{meta.shortLabel}</s-badge>
        </s-stack>

        <s-text tone="neutral">
          {summarizePromotionConfig(promotion.promotionType, promotion.config)}
          {promotion.discountIds.length > 0
            ? ` · ${promotion.discountIds.length} discount(s) synced`
            : " · checkout sync pending"}
        </s-text>

        <s-stack direction="inline" gap="base">
          <Link to={`${meta.href}/${promotion.id}`}>Edit</Link>
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
