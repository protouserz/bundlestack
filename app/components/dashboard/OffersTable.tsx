import { Link } from "react-router";
import type {
  listOffers,
  OfferThumbnail,
} from "../../models/bundle.server";
import styles from "./dashboard.module.css";

type Offer = Awaited<ReturnType<typeof listOffers>>[number];

type OffersTableProps = {
  offers: Offer[];
  thumbnails?: Record<string, OfferThumbnail>;
};

function discountTypeLabel(offer: Offer) {
  const types = new Set(offer.tiers.map((tier) => tier.discountType));
  if (types.size > 1) return "Mixed";
  return types.has("fixed") ? "Fixed amount" : "Percentage";
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OffersTable({
  offers,
  thumbnails = {},
}: OffersTableProps) {
  const recentOffers = [...offers]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Recent offers</h2>

      {recentOffers.length === 0 ? (
        <p className={styles.metricSubtext}>
          No offers yet.{" "}
          <Link className={styles.panelLink} to="/app/offers/new">
            Create your first offer
          </Link>
        </p>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Offer name</th>
                  <th>Status</th>
                  <th>Products</th>
                  <th>Discount type</th>
                  <th>Created</th>
                  <th>Redemptions</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {recentOffers.map((offer) => {
                  const thumb = thumbnails[offer.id];
                  return (
                    <tr key={offer.id}>
                      <td>
                        <div className={styles.offerCell}>
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
                          <span>{offer.title}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            offer.status === "active"
                              ? styles.statusActive
                              : styles.statusDraft
                          }`}
                        >
                          {offer.status}
                        </span>
                      </td>
                      <td>{offer.productIds.length}</td>
                      <td>{discountTypeLabel(offer)}</td>
                      <td>{formatDate(offer.createdAt)}</td>
                      <td>{offer.discountUses ?? 0}</td>
                      <td>
                        <Link
                          className={styles.panelLink}
                          to={`/app/offers/${offer.id}`}
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.panelFooter}>
            <Link className={styles.panelLink} to="/app/offers">
              View all offers
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
