import { Link } from "react-router";
import type { listOffers } from "../models/bundle.server";

type Offer = Awaited<ReturnType<typeof listOffers>>[number];

type OfferCardProps = {
  offer: Offer;
  showTiers?: boolean;
};

export function OfferCard({ offer, showTiers = false }: OfferCardProps) {
  return (
    <s-box padding="large" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" gap="base">
          <s-heading>{offer.title}</s-heading>
          <s-badge tone={offer.status === "active" ? "success" : "info"}>
            {offer.status}
          </s-badge>
        </s-stack>

        {showTiers ? (
          <s-paragraph>
            {offer.tiers.map((tier) => (
              <span key={tier.minQty}>
                Buy {tier.minQty}+ →{" "}
                {tier.discountType === "percentage"
                  ? `${tier.discountValue}% off`
                  : `$${tier.discountValue} off`}
                {" · "}
              </span>
            ))}
          </s-paragraph>
        ) : (
          <s-text tone="neutral">
            {offer.tiers.length} tier(s) · ${offer.revenueGenerated.toFixed(2)}{" "}
            generated · {offer.discountIds.length} discount(s) synced
          </s-text>
        )}

        <s-stack direction="inline" gap="base">
          <Link to={`/app/offers/${offer.id}`}>Edit offer</Link>
          {showTiers && (
            <s-text tone="neutral">
              ${offer.revenueGenerated.toFixed(2)} generated
            </s-text>
          )}
        </s-stack>
      </s-stack>
    </s-box>
  );
}
