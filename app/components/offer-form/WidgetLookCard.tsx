import {
  DEFAULT_WIDGET_LOOK,
  WIDGET_LOOK_PRESETS,
  isBogoOffer,
  type DiscountTier,
  type WidgetLook,
} from "../../models/offer";
import "../../../extensions/bundlestack-widget/assets/bundlestack-widget.css";
import styles from "./offer-form.module.css";

type WidgetLookCardProps = {
  look: WidgetLook;
  onChange: (look: WidgetLook) => void;
  offerType: string;
  tiers: DiscountTier[];
};

function previewLabel(tier: DiscountTier, offerType: string) {
  if (isBogoOffer(offerType)) {
    return tier.label || `Buy ${tier.minQty} get ${tier.getQty ?? 1} free`;
  }
  if (tier.label && !/^save\s/i.test(tier.label.trim())) {
    return tier.label;
  }
  return `Buy ${tier.minQty}`;
}

function previewBadge(tier: DiscountTier, offerType: string) {
  if (isBogoOffer(offerType) || (tier.getQty ?? 0) > 0) return "Free";
  return `Save ${tier.discountValue}%`;
}

export function WidgetLookCard({
  look,
  onChange,
  offerType,
  tiers,
}: WidgetLookCardProps) {
  const rows = tiers;
  const selectedIndex = Math.min(1, Math.max(0, rows.length - 1));

  const setField = <K extends keyof WidgetLook>(field: K, value: WidgetLook[K]) => {
    onChange({ ...look, [field]: value });
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Widget look</h2>
      <p className={styles.cardDescription}>
        Heading and colors for the product-page widget. Checkout discounts stay
        the same. Save to apply on the live store.
      </p>

      <div className={styles.lookPresets} role="group" aria-label="Look presets">
        {WIDGET_LOOK_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={styles.lookPreset}
            onClick={() =>
              onChange({
                ...preset.look,
                heading: look.heading || preset.look.heading,
              })
            }
          >
            {preset.label}
          </button>
        ))}
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Heading</span>
        <input
          className={styles.input}
          name="widgetHeading"
          maxLength={80}
          value={look.heading}
          onChange={(event) => setField("heading", event.target.value)}
        />
      </label>

      <div className={styles.lookColors}>
        {(
          [
            ["accent", "Accent", look.accent],
            ["background", "Background", look.background],
            ["textColor", "Text", look.textColor],
            ["selectedBackground", "Selected row", look.selectedBackground],
          ] as const
        ).map(([field, label, value]) => (
          <label key={field} className={styles.colorField}>
            <span className={styles.fieldLabel}>{label}</span>
            <span className={styles.colorRow}>
              <input
                type="color"
                value={value}
                aria-label={`${label} color`}
                onChange={(event) => setField(field, event.target.value)}
              />
              <input
                className={styles.input}
                name={
                  field === "textColor"
                    ? "widgetTextColor"
                    : field === "selectedBackground"
                      ? "widgetSelectedBackground"
                      : field === "background"
                        ? "widgetBackground"
                        : "widgetAccent"
                }
                value={value}
                onChange={(event) => setField(field, event.target.value)}
              />
            </span>
          </label>
        ))}
      </div>

      <p className={styles.cardDescription}>Preview</p>
      <div
        className="bundlestack-widget"
        style={{
          ["--bs-navy" as string]: look.textColor,
          ["--bs-surface" as string]: look.background,
          ["--bs-emerald" as string]: look.accent,
          ["--bs-emerald-soft" as string]: look.selectedBackground,
          ["--bs-emerald-border" as string]: look.accent,
          margin: 0,
        }}
      >
        <div className="bundlestack-widget__header">
          <p className="bundlestack-widget__title">
            {look.heading || DEFAULT_WIDGET_LOOK.heading}
          </p>
        </div>
        <div className="bundlestack-widget__tiers" role="group">
          {rows.map((tier, index) => {
            const selected = index === selectedIndex;
            return (
              <div
                key={`${tier.minQty}-${index}`}
                className={
                  selected
                    ? "bundlestack-widget__tier bundlestack-widget__tier--selected"
                    : "bundlestack-widget__tier"
                }
                aria-pressed={selected}
              >
                <span className="bundlestack-widget__tier-radio" aria-hidden="true" />
                <span className="bundlestack-widget__tier-label">
                  {previewLabel(tier, offerType)}
                </span>
                <span className="bundlestack-widget__tier-meta">
                  <span className="bundlestack-widget__tier-badge">
                    {previewBadge(tier, offerType)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
