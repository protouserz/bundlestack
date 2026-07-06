import { useCallback, useState, type ReactNode } from "react";
import { Link } from "react-router";
import type { DiscountTier } from "../../models/bundle.server";
import { ProductPickerField, type SelectedProduct } from "../ProductPickerField";
import styles from "./offer-form.module.css";

const OFFER_TYPES = [
  { value: "quantity_break", label: "Quantity discount" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Active", help: "Offer will be active and available to customers." },
  { value: "draft", label: "Draft", help: "Offer is saved but discounts are not synced yet." },
  { value: "paused", label: "Paused", help: "Offer is paused and discounts will be removed." },
] as const;

export const DEFAULT_TIERS: DiscountTier[] = [
  { minQty: 2, discountType: "percentage", discountValue: 10, label: "Save 10%" },
  { minQty: 3, discountType: "percentage", discountValue: 15, label: "Save 15%" },
];

type OfferFormProps = {
  mode: "create" | "edit";
  defaultTitle?: string;
  defaultStatus?: string;
  defaultOfferType?: string;
  initialProducts?: SelectedProduct[];
  initialTiers?: DiscountTier[];
  error?: string;
  isSubmitting?: boolean;
  submitLabel?: string;
  revenueGenerated?: number;
  discountCount?: number;
  deleteButton?: ReactNode;
};

function offerTypeLabel(value: string) {
  return OFFER_TYPES.find((type) => type.value === value)?.label ?? "Quantity discount";
}

function statusHelp(status: string) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.help ?? "";
}

export function OfferForm({
  mode,
  defaultTitle = "",
  defaultStatus = "active",
  defaultOfferType = "quantity_break",
  initialProducts = [],
  initialTiers = DEFAULT_TIERS,
  error,
  isSubmitting = false,
  submitLabel,
  revenueGenerated,
  discountCount,
  deleteButton,
}: OfferFormProps) {
  const [tiers, setTiers] = useState<DiscountTier[]>(initialTiers);
  const [title, setTitle] = useState(defaultTitle);
  const [status, setStatus] = useState(defaultStatus);
  const [offerType, setOfferType] = useState(defaultOfferType);
  const [productCount, setProductCount] = useState(initialProducts.length);

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

  const pageTitle = mode === "create" ? "Create offer" : "Edit offer";
  const saveLabel = submitLabel ?? (mode === "create" ? "Save offer" : "Save changes");

  return (
    <>
      <div className={styles.pageHeader}>
        <Link className={styles.backLink} to="/app/offers" aria-label="Back to offers">
          ←
        </Link>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <s-banner tone="critical">{error}</s-banner>
        </div>
      )}

      <input type="hidden" name="tiers" value={JSON.stringify(tiers)} />
      <input type="hidden" name="offerType" value={offerType} />

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Offer details</h2>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Offer name</span>
                <input
                  className={styles.input}
                  name="title"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Volume Discount Offer"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Offer type</span>
                <select
                  className={styles.select}
                  value={offerType}
                  onChange={(event) => setOfferType(event.target.value)}
                >
                  {OFFER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Products</h2>
            <p className={styles.cardDescription}>
              Select products included in this offer.
            </p>
            <ProductPickerField
              initialProducts={initialProducts}
              onProductsChange={handleProductsChange}
              browseLabel="Browse products"
            />
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Quantity tiers</h2>
            <p className={styles.cardDescription}>
              Set the quantity breaks and discount to apply.
            </p>
            <table className={styles.tierTable}>
              <thead>
                <tr>
                  <th>Minimum quantity</th>
                  <th>Discount</th>
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
                        <button
                          type="button"
                          className={styles.tierDelete}
                          onClick={() => removeTier(index)}
                          aria-label={`Remove tier ${index + 1}`}
                        >
                          🗑
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={styles.addTierButton}>
              <s-button type="button" variant="secondary" onClick={addTier}>
                Add tier
              </s-button>
            </div>
          </section>
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Summary</h2>
            <ul className={styles.summaryList}>
              <li className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Offer type</span>
                <span className={styles.summaryValue}>
                  {offerTypeLabel(offerType)}
                </span>
              </li>
              <li className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Products</span>
                <span className={styles.summaryValue}>
                  {productCount} product{productCount === 1 ? "" : "s"}
                </span>
              </li>
              <li className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Quantity tiers</span>
                <span className={styles.summaryValue}>
                  {tiers.length} tier{tiers.length === 1 ? "" : "s"}
                </span>
              </li>
              {mode === "edit" && (
                <>
                  <li className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Revenue</span>
                    <span className={styles.summaryValue}>
                      ${(revenueGenerated ?? 0).toFixed(2)}
                    </span>
                  </li>
                  <li className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Discounts synced</span>
                    <span className={styles.summaryValue}>
                      {discountCount ?? 0}
                    </span>
                  </li>
                </>
              )}
            </ul>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Status</h2>
            <label className={styles.field}>
              <select
                className={styles.select}
                name="status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.statusHelp}>{statusHelp(status)}</p>
          </section>

          {deleteButton && (
            <section className={`${styles.card} ${styles.dangerCard}`}>
              <h2 className={styles.cardTitle}>Danger zone</h2>
              <p className={styles.dangerText}>
                Permanently delete this offer and remove its Shopify discounts.
              </p>
              {deleteButton}
            </section>
          )}
        </aside>
      </div>

      <div className={styles.footer}>
        <s-button href="/app/offers" variant="tertiary">
          Cancel
        </s-button>
        <s-button type="submit" {...(isSubmitting ? { loading: true } : {})}>
          {saveLabel}
        </s-button>
      </div>
    </>
  );
}
