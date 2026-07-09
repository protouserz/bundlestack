import { useEffect, useRef, useState, type ReactNode } from "react";
import { SButton } from "../polaris";
import styles from "../offer-form/offer-form.module.css";
import type {
  PromotionType,
  PromotionConfigMap,
} from "../../models/promotion.types";
import {
  PROMOTION_TYPE_META,
  defaultConfigForType,
} from "../../models/promotion.types";

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
    help: "Offer is live for shoppers (checkout sync may still be pending for this type).",
  },
  {
    value: "draft",
    label: "Draft",
    help: "Saved in BundleStack but not offered to shoppers yet.",
  },
  {
    value: "paused",
    label: "Paused",
    help: "Hidden from shoppers until you activate it again.",
  },
] as const;

type PromotionFormProps = {
  mode: "create" | "edit";
  promotionType: PromotionType;
  listHref: string;
  defaultTitle?: string;
  defaultStatus?: string;
  defaultConfig?: PromotionConfigMap[PromotionType];
  defaultProductIds?: string[];
  error?: string;
  isSaving?: boolean;
  deleteButton?: ReactNode;
  children?: ReactNode;
};

export function PromotionFormShell({
  mode,
  promotionType,
  listHref,
  defaultTitle = "",
  defaultStatus = "draft",
  defaultConfig,
  defaultProductIds = [],
  error,
  isSaving = false,
  deleteButton,
  children,
}: PromotionFormProps) {
  const meta = PROMOTION_TYPE_META[promotionType];
  const [title, setTitle] = useState(defaultTitle || `New ${meta.label}`);
  const [status, setStatus] = useState(defaultStatus);
  const [config, setConfig] = useState<PromotionConfigMap[PromotionType]>(
    defaultConfig ?? defaultConfigForType(promotionType),
  );
  const [productIds] = useState(defaultProductIds);
  const configInputRef = useRef<HTMLInputElement>(null);
  const productIdsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = configInputRef.current;
    if (!input) return;
    const value = JSON.stringify(config);
    if (input.value !== value) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [config]);

  useEffect(() => {
    const input = productIdsInputRef.current;
    if (!input) return;
    const value = JSON.stringify(productIds);
    if (input.value !== value) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [productIds]);

  const statusHelp =
    STATUS_OPTIONS.find((option) => option.value === status)?.help ?? "";

  return (
    <>
      <div className={styles.pageHeader}>
        <SButton variant="tertiary" href={listHref}>
          ← Back to {meta.label.toLowerCase()}
        </SButton>
        <div className={styles.formActions}>
          <SButton variant="secondary" href={listHref}>
            Cancel
          </SButton>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={isSaving}
          >
            {isSaving
              ? "Saving…"
              : mode === "create"
                ? `Create ${meta.shortLabel}`
                : "Save"}
          </button>
        </div>
      </div>

      {error ? (
        <div className={styles.errorBanner}>
          <s-banner tone="critical">{error}</s-banner>
        </div>
      ) : null}

      <s-banner tone="info">
        <s-text>
          {meta.description} Checkout discount sync for this offer type is
          scaffolding — save configs now; Shopify Functions / BXGY wiring comes
          next.
        </s-text>
      </s-banner>

      <input
        ref={configInputRef}
        type="hidden"
        name="config"
        defaultValue={JSON.stringify(config)}
      />
      <input
        ref={productIdsInputRef}
        type="hidden"
        name="productIds"
        defaultValue={JSON.stringify(productIds)}
      />
      <input type="hidden" name="collectionIds" value="[]" />

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Offer details</h2>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Name</span>
              <input
                className={styles.input}
                name="title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={meta.label}
              />
            </label>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Rules</h2>
            <p className={styles.cardDescription}>{meta.description}</p>
            {children ?? (
              <ConfigEditor
                promotionType={promotionType}
                config={config}
                onChange={setConfig}
              />
            )}
          </section>
        </div>

        <aside className={styles.sidebar}>
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
            <p className={styles.statusHelp}>{statusHelp}</p>
          </section>

          {deleteButton ? (
            <section className={`${styles.card} ${styles.dangerCard}`}>
              <h2 className={styles.cardTitle}>Danger zone</h2>
              <p className={styles.dangerText}>
                Permanently delete this {meta.label.toLowerCase()} offer.
              </p>
              {deleteButton}
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function ConfigEditor({
  promotionType,
  config,
  onChange,
}: {
  promotionType: PromotionType;
  config: PromotionConfigMap[PromotionType];
  onChange: (next: PromotionConfigMap[PromotionType]) => void;
}) {
  if (promotionType === "bogo") {
    const c = config as PromotionConfigMap["bogo"];
    return (
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Buy quantity</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={c.buyQuantity}
            onChange={(event) =>
              onChange({
                ...c,
                buyQuantity: Number(event.target.value) || 1,
              })
            }
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Get quantity</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={c.getQuantity}
            onChange={(event) =>
              onChange({
                ...c,
                getQuantity: Number(event.target.value) || 1,
              })
            }
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Get discount</span>
          <select
            className={styles.select}
            value={c.getDiscountType}
            onChange={(event) =>
              onChange({
                ...c,
                getDiscountType: event.target.value as
                  | "percentage"
                  | "fixed"
                  | "free",
              })
            }
          >
            <option value="free">Free</option>
            <option value="percentage">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
          </select>
        </label>
        {c.getDiscountType !== "free" ? (
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Discount value</span>
            <input
              className={styles.input}
              type="number"
              min={1}
              value={c.getDiscountValue}
              onChange={(event) =>
                onChange({
                  ...c,
                  getDiscountValue: Number(event.target.value) || 0,
                })
              }
            />
          </label>
        ) : null}
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Same product</span>
          <select
            className={styles.select}
            value={c.sameProduct ? "true" : "false"}
            onChange={(event) =>
              onChange({ ...c, sameProduct: event.target.value === "true" })
            }
          >
            <option value="true">Yes</option>
            <option value="false">No (different get products)</option>
          </select>
        </label>
      </div>
    );
  }

  if (promotionType === "free_gift") {
    const c = config as PromotionConfigMap["free_gift"];
    return (
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Min subtotal (USD)</span>
          <input
            className={styles.input}
            type="number"
            min={0}
            value={c.minSubtotal ?? ""}
            onChange={(event) =>
              onChange({
                ...c,
                minSubtotal: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
            placeholder="e.g. 50"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Min quantity</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={c.minQuantity ?? ""}
            onChange={(event) =>
              onChange({
                ...c,
                minQuantity: event.target.value
                  ? Number(event.target.value)
                  : null,
              })
            }
            placeholder="Optional"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Gift quantity</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={c.giftQuantity}
            onChange={(event) =>
              onChange({
                ...c,
                giftQuantity: Number(event.target.value) || 1,
              })
            }
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Auto-add gift</span>
          <select
            className={styles.select}
            value={c.autoAdd ? "true" : "false"}
            onChange={(event) =>
              onChange({ ...c, autoAdd: event.target.value === "true" })
            }
          >
            <option value="false">No — customer chooses</option>
            <option value="true">Yes — add automatically</option>
          </select>
        </label>
        <p className={styles.cardDescription}>
          Gift product picker wiring uses product IDs in a follow-up. For now,
          save the threshold rules.
        </p>
      </div>
    );
  }

  if (promotionType === "mix_match") {
    const c = config as PromotionConfigMap["mix_match"];
    return (
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Minimum items</span>
          <input
            className={styles.input}
            type="number"
            min={2}
            value={c.minItems}
            onChange={(event) =>
              onChange({
                ...c,
                minItems: Number(event.target.value) || 2,
              })
            }
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Discount type</span>
          <select
            className={styles.select}
            value={c.discountType}
            onChange={(event) =>
              onChange({
                ...c,
                discountType: event.target.value as "percentage" | "fixed",
              })
            }
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Discount value</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={c.discountValue}
            onChange={(event) =>
              onChange({
                ...c,
                discountValue: Number(event.target.value) || 0,
              })
            }
          />
        </label>
      </div>
    );
  }

  if (promotionType === "bundle_builder") {
    const c = config as PromotionConfigMap["bundle_builder"];
    return (
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Steps</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={c.steps.length}
            readOnly
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Bundle discount type</span>
          <select
            className={styles.select}
            value={c.discountType}
            onChange={(event) =>
              onChange({
                ...c,
                discountType: event.target.value as "percentage" | "fixed",
              })
            }
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Discount value</span>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={c.discountValue}
            onChange={(event) =>
              onChange({
                ...c,
                discountValue: Number(event.target.value) || 0,
              })
            }
          />
        </label>
        <p className={styles.cardDescription}>
          Default steps: &quot;Choose your base&quot; and &quot;Add extras&quot;.
          Step product pickers land in the next iteration.
        </p>
      </div>
    );
  }

  const c = config as PromotionConfigMap["fbt"];
  return (
    <div className={styles.fieldGrid}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Headline</span>
        <input
          className={styles.input}
          value={c.headline}
          onChange={(event) =>
            onChange({ ...c, headline: event.target.value })
          }
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Discount type</span>
        <select
          className={styles.select}
          value={c.discountType}
          onChange={(event) =>
            onChange({
              ...c,
              discountType: event.target.value as "percentage" | "fixed",
            })
          }
        >
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed amount</option>
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Discount value</span>
        <input
          className={styles.input}
          type="number"
          min={1}
          value={c.discountValue}
          onChange={(event) =>
            onChange({
              ...c,
              discountValue: Number(event.target.value) || 0,
            })
          }
        />
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Require all recommended</span>
        <select
          className={styles.select}
          value={c.requireAll ? "true" : "false"}
          onChange={(event) =>
            onChange({ ...c, requireAll: event.target.value === "true" })
          }
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    </div>
  );
}
