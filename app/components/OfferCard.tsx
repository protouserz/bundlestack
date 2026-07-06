import { Form, Link } from "react-router";
import type { listOffers } from "../models/bundle.server";

type Offer = Awaited<ReturnType<typeof listOffers>>[number];

type OfferCardProps = {
  offer: Offer;
  showTiers?: boolean;
  showDelete?: boolean;
};

export function OfferCard({
  offer,
  showTiers = false,
  showDelete = false,
}: OfferCardProps) {
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
            {offer.tiers.length} tier(s) · {offer.discountUses ?? 0} redemptions ·{" "}
            {offer.discountIds.length} discount(s) synced
          </s-text>
        )}

        <s-stack direction="inline" gap="base">
          <Link to={`/app/offers/${offer.id}`}>Edit offer</Link>
          {showTiers && (
            <s-text tone="neutral">
              {offer.discountUses ?? 0} redemptions
            </s-text>
          )}
          {showDelete && (
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="offerId" value={offer.id} />
              <s-button type="submit" tone="critical" variant="tertiary">
                Delete
              </s-button>
            </Form>
          )}
        </s-stack>
      </s-stack>
    </s-box>
  );
}
