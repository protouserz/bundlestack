import { useState, type ReactNode } from "react";
import { SButton } from "../polaris";
import styles from "../offer-form/offer-form.module.css";

const STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
    help: "Code is live in Shopify and customers can redeem it at checkout.",
  },
  {
    value: "draft",
    label: "Draft",
    help: "Saved in BundleStack but not synced to Shopify yet.",
  },
  {
    value: "paused",
    label: "Paused",
    help: "Removes the Shopify discount code until you activate it again.",
  },
] as const;

type CouponFormProps = {
  mode: "create" | "edit";
  defaultTitle?: string;
  defaultCode?: string;
  defaultStatus?: string;
  defaultDiscountType?: "percentage" | "fixed";
  defaultDiscountValue?: number;
  defaultAppliesOncePerCustomer?: boolean;
  defaultUsageLimit?: number | null;
  defaultStartsAt?: string | null;
  defaultEndsAt?: string | null;
  error?: string;
  isSaving?: boolean;
  deleteButton?: ReactNode;
};

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function CouponForm({
  mode,
  defaultTitle = "",
  defaultCode = "",
  defaultStatus = "active",
  defaultDiscountType = "percentage",
  defaultDiscountValue = 10,
  defaultAppliesOncePerCustomer = true,
  defaultUsageLimit = null,
  defaultStartsAt = null,
  defaultEndsAt = null,
  error,
  isSaving = false,
  deleteButton,
}: CouponFormProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [code, setCode] = useState(defaultCode);
  const [status, setStatus] = useState(defaultStatus);
  const [discountType, setDiscountType] = useState(defaultDiscountType);
  const [discountValue, setDiscountValue] = useState(defaultDiscountValue);
  const [appliesOncePerCustomer, setAppliesOncePerCustomer] = useState(
    defaultAppliesOncePerCustomer,
  );
  const [usageLimit, setUsageLimit] = useState(
    defaultUsageLimit != null ? String(defaultUsageLimit) : "",
  );
  const [startsAt, setStartsAt] = useState(toDateInputValue(defaultStartsAt));
  const [endsAt, setEndsAt] = useState(toDateInputValue(defaultEndsAt));

  const statusHelp =
    STATUS_OPTIONS.find((option) => option.value === status)?.help ?? "";

  return (
    <>
      <div className={styles.pageHeader}>
        <SButton variant="tertiary" href="/app/coupons">
          ← Back to coupons
        </SButton>
        <div className={styles.formActions}>
          <SButton variant="secondary" href="/app/coupons">
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
                ? "Create coupon"
                : "Save"}
          </button>
        </div>
      </div>

      {error ? (
        <div className={styles.errorBanner}>
          <s-banner tone="critical">{error}</s-banner>
        </div>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Coupon details</h2>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Name</span>
                <input
                  className={styles.input}
                  name="title"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Summer sale"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Code</span>
                <input
                  className={styles.input}
                  name="code"
                  required
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                  placeholder="SAVE10"
                />
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Discount</h2>
            <p className={styles.cardDescription}>
              Percentage coupons reduce the cart by a percent. Fixed-amount
              coupons work like a gift-card style checkout credit (synced as a
              Shopify discount code — not a Shopify Gift Card balance).
            </p>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Type</span>
                <select
                  className={styles.select}
                  name="discountType"
                  value={discountType}
                  onChange={(event) =>
                    setDiscountType(
                      event.target.value === "fixed" ? "fixed" : "percentage",
                    )
                  }
                >
                  <option value="percentage">Percentage off</option>
                  <option value="fixed">Fixed amount off</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  {discountType === "percentage" ? "Percent" : "Amount (USD)"}
                </span>
                <input
                  className={styles.input}
                  name="discountValue"
                  type="number"
                  min={discountType === "percentage" ? 1 : 0.01}
                  max={discountType === "percentage" ? 100 : undefined}
                  step={discountType === "percentage" ? 1 : 0.01}
                  required
                  value={discountValue}
                  onChange={(event) =>
                    setDiscountValue(Number(event.target.value) || 0)
                  }
                />
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Limits & schedule</h2>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Total usage limit</span>
                <input
                  className={styles.input}
                  name="usageLimit"
                  type="number"
                  min={1}
                  value={usageLimit}
                  onChange={(event) => setUsageLimit(event.target.value)}
                  placeholder="Unlimited"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Once per customer</span>
                <select
                  className={styles.select}
                  name="appliesOncePerCustomer"
                  value={appliesOncePerCustomer ? "true" : "false"}
                  onChange={(event) =>
                    setAppliesOncePerCustomer(event.target.value === "true")
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Starts at</span>
                <input
                  className={styles.input}
                  name="startsAt"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ends at</span>
                <input
                  className={styles.input}
                  name="endsAt"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className={styles.sidebar}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Summary</h2>
            <ul className={styles.summaryList}>
              <li className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Code</span>
                <span className={styles.summaryValue}>{code || "—"}</span>
              </li>
              <li className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Discount</span>
                <span className={styles.summaryValue}>
                  {discountType === "percentage"
                    ? `${discountValue}% off`
                    : `$${Number(discountValue).toFixed(2)} off`}
                </span>
              </li>
              <li className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Usage</span>
                <span className={styles.summaryValue}>
                  {usageLimit ? `${usageLimit} total` : "Unlimited"}
                  {appliesOncePerCustomer ? " · once per customer" : ""}
                </span>
              </li>
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
            <p className={styles.statusHelp}>{statusHelp}</p>
          </section>

          {deleteButton ? (
            <section className={`${styles.card} ${styles.dangerCard}`}>
              <h2 className={styles.cardTitle}>Danger zone</h2>
              <p className={styles.dangerText}>
                Permanently delete this coupon and remove its Shopify discount
                code.
              </p>
              {deleteButton}
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
