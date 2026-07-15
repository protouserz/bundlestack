import { Link } from "react-router";
import type { listOffers } from "../../models/bundle.server";
import styles from "./dashboard.module.css";

type Offer = Awaited<ReturnType<typeof listOffers>>[number];

type TopOffersListProps = {
  offers: Offer[];
};

function tierSummary(offer: Offer) {
  const topTier = [...offer.tiers].sort(
    (a, b) => b.discountValue - a.discountValue,
  )[0];
  if (!topTier) return "Quantity break";
  return topTier.discountType === "percentage"
    ? `Up to ${topTier.discountValue}% off`
    : `Up to $${topTier.discountValue} off`;
}

export function TopOffersList({ offers }: TopOffersListProps) {
  const topOffers = [...offers]
    .sort((a, b) => (b.discountUses ?? 0) - (a.discountUses ?? 0))
    .slice(0, 3);

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Top performing offers</h2>

      {topOffers.length === 0 ? (
        <p className={styles.metricSubtext}>Create an offer to see performance here.</p>
      ) : (
        <ul className={styles.topList}>
          {topOffers.map((offer) => (
            <li key={offer.id} className={styles.topItem}>
              <div className={styles.topThumb} aria-hidden="true" />
              <div className={styles.topMeta}>
                <p className={styles.topName}>{offer.title}</p>
                <p className={styles.topDetail}>
                  {offer.productIds.length} product
                  {offer.productIds.length === 1 ? "" : "s"} · {tierSummary(offer)}
                </p>
              </div>
              <span className={styles.topRevenue}>
                {offer.discountUses ?? 0} uses
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.panelFooter}>
        <Link className={styles.panelLink} to="/app/offers">
          View all offers
        </Link>
      </div>
    </div>
  );
}
