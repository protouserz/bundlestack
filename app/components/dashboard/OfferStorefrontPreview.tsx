import { useState } from "react";
import {
  DEFAULT_QUANTITY_TIERS,
  DEFAULT_WIDGET_LOOK,
  OFFER_TYPE_QUANTITY_BREAK,
  isThemeLook,
  storefrontPreviewModel,
  type DiscountTier,
  type StorefrontPreviewProduct,
  type WidgetLook,
} from "../../models/offer";
import { useI18n } from "../../i18n/I18nProvider";
import {
  overlayCopy,
  tierBadgeCopy,
  tierLabelCopy,
  widgetHeadingCopy,
} from "../../i18n/storefrontCopy";
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
  const { t, locale } = useI18n();
  const source = offer?.tiers?.length
    ? offer
    : {
        offerType: OFFER_TYPE_QUANTITY_BREAK,
        tiers: DEFAULT_QUANTITY_TIERS,
      };
  const model = storefrontPreviewModel(offer, {
    exampleAmount: product?.exampleAmount,
    currencyCode: product?.currencyCode,
    locale,
  });
  const look = offer?.widgetLook ?? DEFAULT_WIDGET_LOOK;
  const matchingTheme = isThemeLook(look);
  const defaultKey =
    model.rows.find((row) => row.defaultSelected)?.key ?? null;
  const [selectedKey, setSelectedKey] = useState<string | null>(defaultKey);
  const heading = widgetHeadingCopy(look.heading || model.title, t);
  const overlay = overlayCopy(source, t);

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
        <span className={styles.storefrontPreviewBadge}>{overlay}</span>
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
          {heading}
        </p>
        {matchingTheme ? (
          <p className={styles.storefrontPreviewThemeNote}>
            {t("widget.themeNote")}
          </p>
        ) : null}
        <div
          className={styles.storefrontPreviewTiers}
          role="group"
          aria-label={t("theme.previewAria")}
        >
          {model.rows.map((row, index) => {
            const selected = selectedKey === row.key;
            const tier = source.tiers[index];
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
                  {tier
                    ? tierLabelCopy(tier, source.offerType, t)
                    : row.label}
                </span>
                <span className={styles.storefrontPreviewTierMeta}>
                  <span className={styles.storefrontPreviewTierBadge}>
                    {tier
                      ? tierBadgeCopy(tier, source.offerType, t)
                      : row.badge}
                  </span>
                  <span className={styles.storefrontPreviewPrice}>
                    {t("storefront.unitEach", { price: row.unitPrice })}
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
