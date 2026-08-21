import type { ShopHealth } from "../../models/health.server";
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

function healthLabel(overall: ShopHealth["overall"]) {
  if (overall === "healthy") return "Good";
  if (overall === "attention") return "Needs attention";
  return "Action required";
}

export function DashboardMetrics({
  activeOffers,
  totalOffers,
  discountUses,
  health,
}: DashboardMetricsProps) {
  return (
    <s-grid gridTemplateColumns="repeat(3, minmax(0, 1fr))" gap="base">
      <s-section heading="Active offers">
        <s-stack direction="block" gap="small-200">
          <s-heading>{activeOffers}</s-heading>
          <s-paragraph>
            {totalOffers} total configured
          </s-paragraph>
          <Sparkline
            className={styles.sparkline}
            values={buildSparklineFromCount(activeOffers)}
          />
        </s-stack>
      </s-section>

      <s-section heading="Discount redemptions">
        <s-stack direction="block" gap="small-200">
          <s-heading>{discountUses}</s-heading>
          <s-paragraph>
            {discountUses > 0
              ? "Synced from Shopify automatic discounts"
              : "Updates when shoppers use your bundle tiers"}
          </s-paragraph>
          <Sparkline
            className={styles.sparkline}
            values={buildSparklineFromRevenue(discountUses)}
          />
        </s-stack>
      </s-section>

      <s-section heading="Store health">
        <s-stack direction="block" gap="small-200">
          <s-heading>{healthLabel(health.overall)}</s-heading>
          <s-paragraph>
            {health.overall === "healthy"
              ? "All systems operational"
              : "Review system checks below"}
          </s-paragraph>
        </s-stack>
      </s-section>
    </s-grid>
  );
}
