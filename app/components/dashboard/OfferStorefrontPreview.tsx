import { useState } from "react";
import {
  DEFAULT_WIDGET_LOOK,
  isThemeLook,
  storefrontPreviewModel,
  type DiscountTier,
  type StorefrontPreviewProduct,
  type WidgetLook,
} from "../../models/offer";
import styles from "./dashboard.module.css";

type PreviewOffer = {
  offerType: string;
  title?: string;
  tiers: DiscountTier[];
  widgetLook?: WidgetLook;
};

export function OfferStorefrontPreview({
  offer,
  product,
}: {
  offer?: PreviewOffer | null;
  product?: StorefrontPreviewProduct | null;
}) {
  const model = storefrontPreviewModel(offer, {
    exampleAmount: product?.exampleAmount,
    currencyCode: product?.currencyCode,
  });
  const look = offer?.widgetLook ?? DEFAULT_WIDGET_LOOK;
  const matchingTheme = isThemeLook(look);
  const defaultKey =
    model.rows.find((row) => row.defaultSelected)?.key ?? null;
  const [selectedKey, setSelectedKey] = useState<string | null>(defaultKey);

  return (
    <div
      className={styles.storefrontPreview}
      style={{
        ["--preview-accent" as string]: look.accent,
        ["--preview-soft" as string]: look.selectedBackground,
        ["--preview-surface" as string]: look.background,
        ["--preview-text" as string]: look.textColor,
      }}
    >
      <div className={styles.storefrontPreviewCard}>
        <span className={styles.storefrontPreviewBadge}>{model.overlay}</span>
        {product?.imageUrl ? (
          <img
            className={styles.storefrontPreviewPhoto}
            src={product.imageUrl}
            alt={product.imageAlt || product.title}
          />
        ) : (
          <div className={styles.storefrontPreviewImage} aria-hidden="true" />
        )}
        {product?.title ? (
          <span className={styles.storefrontPreviewProductName}>
            {product.title}
          </span>
        ) : null}
      </div>

      <div className={styles.storefrontPreviewWidget}>
        <p className={styles.storefrontPreviewWidgetTitle}>
          {look.heading || model.title}
        </p>
        {matchingTheme ? (
          <p className={styles.storefrontPreviewThemeNote}>
            Colors follow your live theme.
          </p>
        ) : null}
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
