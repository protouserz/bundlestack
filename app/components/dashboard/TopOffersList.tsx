import { Link } from "react-router";
import { isCatalogOffer, offerDiscountSummary } from "../../models/offer";
import type { listOffers, OfferThumbnail } from "../../models/bundle.server";
import styles from "./dashboard.module.css";

type Offer = Awaited<ReturnType<typeof listOffers>>[number];

type TopOffersListProps = {
  offers: Offer[];
  thumbnails?: Record<string, OfferThumbnail>;
};

export function TopOffersList({
  offers,
  thumbnails = {},
}: TopOffersListProps) {
  const topOffers = [...offers]
    .sort((a, b) => (b.discountUses ?? 0) - (a.discountUses ?? 0))
    .slice(0, 3);

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Top performing offers</h2>

      {topOffers.length === 0 ? (
        <p className={styles.metricSubtext}>
          Create an offer to see performance here.
        </p>
      ) : (
        <ul className={styles.topList}>
          {topOffers.map((offer) => {
            const thumb = thumbnails[offer.id];
            return (
              <li key={offer.id} className={styles.topItem}>
                <div className={styles.topThumb} aria-hidden="true">
                  {thumb ? (
                    <img
                      className={styles.topThumbImage}
                      src={thumb.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className={styles.topMeta}>
                  <p className={styles.topName}>{offer.title}</p>
                  <p className={styles.topDetail}>
                    {isCatalogOffer(offer.productIds)
                      ? "All products"
                      : `${offer.productIds.length} product${
                          offer.productIds.length === 1 ? "" : "s"
                        }`}{" "}
                    · {offerDiscountSummary(offer)}
                  </p>
                </div>
                <span className={styles.topRevenue}>
                  {offer.discountUses ?? 0} uses
                </span>
              </li>
            );
          })}
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
