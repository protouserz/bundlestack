import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_BOGO_TIERS,
  DEFAULT_BOGO_TITLE,
  DEFAULT_OFFER_TITLE,
  DEFAULT_WIDGET_LOOK,
  bogoLabel,
  isBogoOffer,
  type DiscountTier,
  type WidgetLook,
} from "../../models/offer";
import { useLeaveWithSaveBar } from "../AdminLink";
import { ProductPickerField, type SelectedProduct } from "../ProductPickerField";
import { SButton } from "../polaris";
import { WidgetLookCard } from "./WidgetLookCard";
import { useI18n } from "../../i18n/I18nProvider";
import styles from "./offer-form.module.css";

export const DEFAULT_TIERS: DiscountTier[] = [
  { minQty: 2, discountType: "percentage", discountValue: 10, label: "Save 10%" },
  { minQty: 3, discountType: "percentage", discountValue: 15, label: "Save 15%" },
];

type OfferFormProps = {
  mode: "create" | "edit";
  defaultTitle?: string;
  defaultStatus?: string;
  defaultOfferType?: string;
  defaultAllProducts?: boolean;
  initialProducts?: SelectedProduct[];
  initialTiers?: DiscountTier[];
  defaultWidgetLook?: WidgetLook;
  error?: string;
  discountUses?: number;
  discountCount?: number;
  deleteButton?: ReactNode;
  isSaving?: boolean;
};

export function OfferForm({
  mode,
  defaultTitle = "",
  defaultStatus = "active",
  defaultOfferType = "quantity_break",
  defaultAllProducts,
  initialProducts = [],
  initialTiers = DEFAULT_TIERS,
  defaultWidgetLook,
  error,
  discountUses,
  discountCount,
  deleteButton,
  isSaving = false,
}: OfferFormProps) {
  const [tiers, setTiers] = useState<DiscountTier[]>(initialTiers);
  const [title, setTitle] = useState(defaultTitle);
  const [status, setStatus] = useState(defaultStatus);
  const [offerType, setOfferType] = useState(defaultOfferType);
  const [allProducts, setAllProducts] = useState(
    defaultAllProducts ?? (mode === "create" || initialProducts.length === 0),
  );
  const [productCount, setProductCount] = useState(initialProducts.length);
  const [widgetLook, setWidgetLook] = useState<WidgetLook>(
    defaultWidgetLook ?? DEFAULT_WIDGET_LOOK,
  );
  const tiersInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = tiersInputRef.current;
    if (!input) return;

    const value = JSON.stringify(tiers);
    if (input.value !== value) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [tiers]);

  const updateTier = (index: number, field: keyof DiscountTier, value: string) => {
    setTiers((current) =>
      current.map((tier, i) => {
        if (i !== index) return tier;
        if (field === "minQty" || field === "discountValue") {
          const numeric = Number(value) || 0;
          const next = { ...tier, [field]: numeric };
          if (field === "discountValue") {
            next.label = `Save ${numeric}%`;
          }
          return next;
        }
        return { ...tier, [field]: value };
      }),
    );
  };

  const handleOfferTypeChange = (value: string) => {
    setOfferType(value);
    if (value === "bogo") {
      setTiers((current) =>
        current.length === 1 && (current[0].getQty ?? 0) > 0
          ? current
          : DEFAULT_BOGO_TIERS,
      );
      if (
        mode === "create" &&
        (title === defaultTitle ||
          title === DEFAULT_OFFER_TITLE ||
          title === "Volume Discount Offer")
      ) {
        setTitle(DEFAULT_BOGO_TITLE);
      }
      return;
    }

    setTiers((current) =>
      current.some((tier) => (tier.getQty ?? 0) > 0) ? DEFAULT_TIERS : current,
    );
    if (mode === "create" && title === DEFAULT_BOGO_TITLE) {
      setTitle(defaultTitle || "Volume Discount Offer");
    }
  };

  const updateBogoQty = (field: "minQty" | "getQty", value: string) => {
    const numeric = Math.max(1, Math.min(10, Number(value) || 1));
    setTiers((current) => {
      const buyQty = field === "minQty" ? numeric : current[0]?.minQty ?? 1;
      const getQty = field === "getQty" ? numeric : current[0]?.getQty ?? 1;
      return [
        {
          minQty: buyQty,
          getQty,
          discountType: "percentage",
          discountValue: 100,
          label: bogoLabel(buyQty, getQty),
        },
      ];
    });
  };

  const addTier = () => {
    setTiers((current) => {
      const nextQty = (current.at(-1)?.minQty ?? 1) + 1;
      const nextDiscount = Math.min((current.at(-1)?.discountValue ?? 10) + 5, 50);
      return [
        ...current,
        {
          minQty: nextQty,
          discountType: "percentage",
          discountValue: nextDiscount,
          label: `Save ${nextDiscount}%`,
        },
      ];
    });
  };

  const removeTier = (index: number) => {
    setTiers((current) => current.filter((_, i) => i !== index));
  };

  const handleProductsChange = useCallback((count: number) => {
    setProductCount(count);
  }, []);

  const leaveWithSaveBar = useLeaveWithSaveBar();
  const { t, plural } = useI18n();
  const offerTypes = [
    { value: "quantity_break", label: t("offers.typeQuantity") },
    { value: "bogo", label: t("offers.typeBogo") },
  ] as const;
  const statusOptions = [
    {
      value: "active",
      label: t("status.active"),
      help: t("status.activeHelpOffer"),
    },
    {
      value: "draft",
      label: t("status.draft"),
      help: t("status.draftHelpOffer"),
    },
    {
      value: "paused",
      label: t("status.paused"),
      help: t("status.pausedHelpOffer"),
    },
  ] as const;
  const offerTypeLabel = (value: string) =>
    offerTypes.find((type) => type.value === value)?.label ??
    t("offers.typeQuantity");
  const statusHelp =
    statusOptions.find((option) => option.value === status)?.help ?? "";

  return (
    <>
      <div className={styles.pageHeader}>
        <SButton
          variant="tertiary"
          type="button"
          onClick={() => {
            void leaveWithSaveBar("/app/offers");
          }}
        >
          {t("offers.back")}
        </SButton>
        <div className={styles.formActions}>
          <SButton
            variant="secondary"
            type="button"
            onClick={() => {
              void leaveWithSaveBar("/app/offers");
            }}
          >
            {t("common.cancel")}
          </SButton>
          <SButton variant="primary" type="submit" disabled={isSaving}>
            {isSaving
              ? t("common.saving")
              : mode === "create"
                ? t("offers.create")
                : t("common.save")}
          </SButton>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <s-banner tone="critical">{error}</s-banner>
        </div>
      )}

      <input
        ref={tiersInputRef}
        type="hidden"
        name="tiers"
        defaultValue={JSON.stringify(tiers)}
      />
      <input type="hidden" name="offerType" value={offerType} />

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{t("offers.details")}</h2>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t("offers.name")}</span>
                <input
                  className={styles.input}
                  name="title"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("offers.namePlaceholder")}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>{t("offers.type")}</span>
                <select
                  className={styles.select}
                  value={offerType}
                  onChange={(event) => handleOfferTypeChange(event.target.value)}
                >
                  {offerTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{t("offers.products")}</h2>
            <p className={styles.cardDescription}>
              {t("offers.productsHelp")}
            </p>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                name="allProducts"
                value="true"
                checked={allProducts}
                onChange={(event) => setAllProducts(event.target.checked)}
              />
              <span>{t("offers.allProducts")}</span>
            </label>
            {allProducts ? (
              <p className={styles.cardDescription}>
                {isBogoOffer(offerType)
                  ? t("offers.allProductsBogo")
                  : t("offers.allProductsQty")}
              </p>
            ) : (
              <ProductPickerField
                initialProducts={initialProducts}
                onProductsChange={handleProductsChange}
                browseLabel={t("offers.browse")}
                required
              />
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              {isBogoOffer(offerType) ? t("offers.bogoSection") : t("offers.tiersSection")}
            </h2>
            <p className={styles.cardDescription}>
              {isBogoOffer(offerType)
                ? t("offers.bogoHelp")
                : t("offers.tiersHelp")}
            </p>
            {isBogoOffer(offerType) ? (
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{t("offers.buy")}</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    max={10}
                    value={tiers[0]?.minQty ?? 1}
                    onChange={(event) =>
                      updateBogoQty("minQty", event.target.value)
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>{t("offers.getFree")}</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    max={10}
                    value={tiers[0]?.getQty ?? 1}
                    onChange={(event) =>
                      updateBogoQty("getQty", event.target.value)
                    }
                  />
                </label>
              </div>
            ) : (
              <>
            <table className={styles.tierTable}>
              <thead>
                <tr>
                  <th>{t("offers.minQty")}</th>
                  <th>{t("offers.discount")}</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        className={styles.tierInput}
                        type="number"
                        min={2}
                        value={tier.minQty}
                        onChange={(event) =>
                          updateTier(index, "minQty", event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <select
                        className={styles.tierSelect}
                        value={tier.discountValue}
                        onChange={(event) =>
                          updateTier(index, "discountValue", event.target.value)
                        }
                      >
                        {Array.from(
                          new Set([
                            5, 10, 15, 20, 25, 30, 35, 40, 50,
                            tier.discountValue,
                          ]),
                        )
                          .sort((a, b) => a - b)
                          .map((value) => (
                            <option key={value} value={value}>
                              {value}%
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      {tiers.length > 1 && (
                        <SButton
                          type="button"
                          variant="tertiary"
                          tone="critical"
                          onClick={() => removeTier(index)}
                          accessibilityLabel={t("offers.removeTier", { n: index + 1 })}
                        >
                          {t("offers.remove")}
                        </SButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.addTierButton}>
              <SButton type="button" variant="secondary" onClick={addTier}>
                {t("offers.addTier")}
              </SButton>
            </div>
              </>
            )}
          </section>

          <WidgetLookCard
            look={widgetLook}
            onChange={setWidgetLook}
            offerType={offerType}
            tiers={tiers}
          />
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{t("offers.summary")}</h2>
            <ul className={styles.summaryList}>
              <li className={styles.summaryItem}>
                <span className={styles.summaryLabel}>{t("offers.type")}</span>
                <span className={styles.summaryValue}>
                  {offerTypeLabel(offerType)}
                </span>
              </li>
              <li className={styles.summaryItem}>
                <span className={styles.summaryLabel}>{t("offers.products")}</span>
                <span className={styles.summaryValue}>
                  {allProducts
                    ? t("offers.allProducts")
                    : plural("offers.productCount", productCount)}
                </span>
              </li>
              <li className={styles.summaryItem}>
                <span className={styles.summaryLabel}>
                  {isBogoOffer(offerType) ? t("offers.deal") : t("offers.tiersSection")}
                </span>
                <span className={styles.summaryValue}>
                  {isBogoOffer(offerType)
                    ? bogoLabel(tiers[0]?.minQty ?? 1, tiers[0]?.getQty ?? 1)
                    : plural("offers.tierCount", tiers.length)}
                </span>
              </li>
              {mode === "edit" && (
                <>
                  <li className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>{t("offers.redemptions")}</span>
                    <span className={styles.summaryValue}>
                      {discountUses ?? 0}
                    </span>
                  </li>
                  <li className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>{t("offers.discountsSynced")}</span>
                    <span className={styles.summaryValue}>
                      {discountCount ?? 0}
                    </span>
                  </li>
                </>
              )}
            </ul>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{t("offers.status")}</h2>
            <label className={styles.field}>
              <select
                className={styles.select}
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.statusHelp}>{statusHelp}</p>
          </section>

          {deleteButton && (
            <section className={`${styles.card} ${styles.dangerCard}`}>
              <h2 className={styles.cardTitle}>{t("offers.danger")}</h2>
              <p className={styles.dangerText}>
                {t("offers.dangerBody")}
              </p>
              {deleteButton}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
