import { useState } from "react";
import {
  storefrontPreviewModel,
  type DiscountTier,
} from "../../models/offer";
import styles from "./dashboard.module.css";

type PreviewOffer = {
  offerType: string;
  title?: string;
  tiers: DiscountTier[];
};

export function OfferStorefrontPreview({
  offer,
}: {
  offer?: PreviewOffer | null;
}) {
  const model = storefrontPreviewModel(offer);
  const defaultKey =
    model.rows.find((row) => row.defaultSelected)?.key ?? null;
  const [selectedKey, setSelectedKey] = useState<string | null>(defaultKey);

  return (
    <div className={styles.storefrontPreview}>
      <div className={styles.storefrontPreviewCard}>
        <span className={styles.storefrontPreviewBadge}>{model.overlay}</span>
        <div className={styles.storefrontPreviewImage} aria-hidden="true" />
      </div>

      <div className={styles.storefrontPreviewWidget}>
        <p className={styles.storefrontPreviewWidgetTitle}>{model.title}</p>
        <div
          className={styles.storefrontPreviewTiers}
          role="group"
          aria-label="Example quantity offers"
        >
          {model.rows.map((row) => {
            const selected = selectedKey === row.key;
            return (
              <button
                key={row.key}
                type="button"
                className={
                  selected
                    ? styles.storefrontPreviewTierSelected
                    : styles.storefrontPreviewTier
                }
                aria-pressed={selected}
                onClick={() =>
                  setSelectedKey((current) =>
                    current === row.key ? null : row.key,
                  )
                }
              >
                <span
                  className={styles.storefrontPreviewRadio}
                  aria-hidden="true"
                />
                <span className={styles.storefrontPreviewTierLabel}>
                  {row.label}
                </span>
                <span className={styles.storefrontPreviewTierMeta}>
                  <span className={styles.storefrontPreviewTierBadge}>
                    {row.badge}
                  </span>
                  <span className={styles.storefrontPreviewPrice}>
                    {row.unitPriceLabel}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
