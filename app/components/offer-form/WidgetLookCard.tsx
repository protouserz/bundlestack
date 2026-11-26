import {
  DEFAULT_WIDGET_LOOK,
  WIDGET_LOOK_PRESETS,
  isThemeLook,
  type DiscountTier,
  type WidgetLook,
} from "../../models/offer";
import { useI18n } from "../../i18n/I18nProvider";
import {
  tierBadgeCopy,
  tierLabelCopy,
  widgetHeadingCopy,
} from "../../i18n/storefrontCopy";
import "../../../extensions/bundlestack-widget/assets/bundlestack-widget.css";
import styles from "./offer-form.module.css";

type WidgetLookCardProps = {
  look: WidgetLook;
  onChange: (look: WidgetLook) => void;
  offerType: string;
  tiers: DiscountTier[];
};

function presetSelected(
  preset: (typeof WIDGET_LOOK_PRESETS)[number],
  look: WidgetLook,
) {
  if (preset.id === "theme") return isThemeLook(look);
  if (isThemeLook(look)) return false;
  return (
    preset.look.accent === look.accent &&
    preset.look.background === look.background &&
    preset.look.textColor === look.textColor &&
    preset.look.selectedBackground === look.selectedBackground
  );
}

export function WidgetLookCard({
  look,
  onChange,
  offerType,
  tiers,
}: WidgetLookCardProps) {
  const { t } = useI18n();
  const rows = tiers;
  const selectedIndex = Math.min(1, Math.max(0, rows.length - 1));
  const matchingTheme = isThemeLook(look);
  const presetLabel = (id: string, fallback: string) => {
    if (id === "theme") return t("widget.matchTheme");
    if (id === "emerald") return t("widget.emerald");
    if (id === "navy") return t("widget.navy");
    return fallback;
  };

  const setField = <K extends keyof WidgetLook>(field: K, value: WidgetLook[K]) => {
    onChange({ ...look, matchTheme: false, [field]: value });
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{t("widget.look")}</h2>
      <p className={styles.cardDescription}>
        {t("widget.lookHelp")}
      </p>

      <div className={styles.lookPresets} role="group" aria-label={t("widget.presets")}>
        {WIDGET_LOOK_PRESETS.map((preset) => {
          const selected = presetSelected(preset, look);
          return (
            <button
              key={preset.id}
              type="button"
              className={
                selected ? styles.lookPresetSelected : styles.lookPreset
              }
              aria-pressed={selected}
              onClick={() =>
                onChange({
                  ...preset.look,
                  heading: look.heading || preset.look.heading,
                })
              }
            >
              {presetLabel(preset.id, preset.label)}
            </button>
          );
        })}
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>{t("widget.heading")}</span>
        <input
          className={styles.input}
          name="widgetHeading"
          maxLength={80}
          value={look.heading}
          onChange={(event) =>
            onChange({ ...look, heading: event.target.value })
          }
        />
      </label>

      <input
        type="hidden"
        name="widgetMatchTheme"
        value={matchingTheme ? "true" : "false"}
      />

      {matchingTheme ? (
        <p className={styles.cardDescription}>
          {t("widget.liveTheme")}
        </p>
      ) : (
        <div className={styles.lookColors}>
          {(
            [
              ["accent", t("widget.accent"), look.accent],
              ["background", t("widget.background"), look.background],
              ["textColor", t("widget.text"), look.textColor],
              ["selectedBackground", t("widget.selectedRow"), look.selectedBackground],
            ] as const
          ).map(([field, label, value]) => (
            <label key={field} className={styles.colorField}>
              <span className={styles.fieldLabel}>{label}</span>
              <span className={styles.colorRow}>
                <input
                  type="color"
                  value={value}
                  aria-label={t("widget.colorAria", { label })}
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
      )}

      <p className={styles.cardDescription}>{t("widget.preview")}</p>
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
            {widgetHeadingCopy(look.heading || DEFAULT_WIDGET_LOOK.heading, t)}
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
                  {tierLabelCopy(tier, offerType, t)}
                </span>
                <span className="bundlestack-widget__tier-meta">
                  <span className="bundlestack-widget__tier-badge">
                    {tierBadgeCopy(tier, offerType, t)}
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
