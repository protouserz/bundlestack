import type { ShopHealth } from "../../models/health.server";
import { useI18n } from "../../i18n/I18nProvider";
import {
  Sparkline,
  buildSparklineFromCount,
  buildSparklineFromRevenue,
} from "./Sparkline";
import styles from "./dashboard.module.css";

type DashboardMetricsProps = {
  activeOffers: number;
  totalOffers: number;
  discountUses: number;
  health: ShopHealth;
};

export function DashboardMetrics({
  activeOffers,
  totalOffers,
  discountUses,
  health,
}: DashboardMetricsProps) {
  const { t } = useI18n();
  const healthLabel =
    health.overall === "healthy"
      ? t("metrics.healthGood")
      : health.overall === "attention"
        ? t("metrics.healthAttention")
        : t("metrics.healthCritical");

  return (
    <s-grid gridTemplateColumns="repeat(3, minmax(0, 1fr))" gap="base">
      <s-section heading={t("metrics.activeOffers")}>
        <s-stack direction="block" gap="small-200">
          <s-heading>{activeOffers}</s-heading>
          <s-paragraph>
            {t("metrics.totalConfigured", { count: totalOffers })}
          </s-paragraph>
          <Sparkline
            className={styles.sparkline}
            values={buildSparklineFromCount(activeOffers)}
          />
        </s-stack>
      </s-section>

      <s-section heading={t("metrics.discountRedemptions")}>
        <s-stack direction="block" gap="small-200">
          <s-heading>{discountUses}</s-heading>
          <s-paragraph>
            {discountUses > 0
              ? t("metrics.redemptionsSynced")
              : t("metrics.redemptionsEmpty")}
          </s-paragraph>
          <Sparkline
            className={styles.sparkline}
            values={buildSparklineFromRevenue(discountUses)}
          />
        </s-stack>
      </s-section>

      <s-section heading={t("metrics.storeHealth")}>
        <s-stack direction="block" gap="small-200">
          <s-heading>{healthLabel}</s-heading>
          <s-paragraph>
            {health.overall === "healthy"
              ? t("metrics.allOperational")
              : t("metrics.reviewChecks")}
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-grid>
  );
}
