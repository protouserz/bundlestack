import type { ShopHealth } from "../../models/health.server";
import styles from "./dashboard.module.css";
import {
  Sparkline,
  buildSparklineFromCount,
  buildSparklineFromRevenue,
} from "./Sparkline";

type DashboardMetricsProps = {
  activeOffers: number;
  totalOffers: number;
  discountUses: number;
  health: ShopHealth;
};

function healthLabel(overall: ShopHealth["overall"]) {
  if (overall === "healthy") return "Good";
  if (overall === "attention") return "Needs attention";
  return "Action required";
}

function healthScore(checks: ShopHealth["checks"]) {
  if (checks.length === 0) return 0;
  const okCount = checks.filter((check) => check.status === "ok").length;
  return Math.round((okCount / checks.length) * 100);
}

export function DashboardMetrics({
  activeOffers,
  totalOffers,
  discountUses,
  health,
}: DashboardMetricsProps) {
  const score = healthScore(health.checks);

  return (
    <div className={styles.metricsRow}>
      <div className={styles.metricCard}>
        <p className={styles.metricLabel}>Active offers</p>
        <p className={styles.metricValue}>{activeOffers}</p>
        <p className={styles.trendUp}>
          <span aria-hidden="true">↗</span>
          {totalOffers} total configured
        </p>
        <Sparkline
          className={styles.sparkline}
          values={buildSparklineFromCount(activeOffers)}
        />
      </div>

      <div className={styles.metricCard}>
        <p className={styles.metricLabel}>Discount redemptions</p>
        <p className={styles.metricValue}>{discountUses}</p>
        <p className={styles.metricSubtext}>
          {discountUses > 0
            ? "Synced from Shopify automatic discounts"
            : "Updates when shoppers use your bundle tiers"}
        </p>
        <Sparkline
          className={styles.sparkline}
          values={buildSparklineFromRevenue(discountUses)}
        />
      </div>

      <div className={styles.metricCard}>
        <p className={styles.metricLabel}>Store health</p>
        <p className={styles.metricValue}>{healthLabel(health.overall)}</p>
        <p className={styles.metricSubtext}>
          {health.overall === "healthy"
            ? "All systems operational"
            : "Review system checks below"}
        </p>
        <div className={styles.healthBar} aria-hidden="true">
          <div
            className={styles.healthBarFill}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
}
