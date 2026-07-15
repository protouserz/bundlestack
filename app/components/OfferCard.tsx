import { Link, useSubmit } from "react-router";
import type { listOffers } from "../models/bundle.server";
import { SButton } from "./polaris";

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
  const submit = useSubmit();

  const handleDelete = () => {
    void submit(
      { intent: "delete", offerId: offer.id },
      { method: "post" },
    );
  };

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
            {offer.tiers.length} tier(s) · {offer.discountUses ?? 0} redemptions
            {offer.discountIds.length > 0 ? " · synced to Shopify" : ""}
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
            <SButton
              type="button"
              tone="critical"
              variant="tertiary"
              onClick={handleDelete}
            >
              Delete
            </SButton>
          )}
        </s-stack>
      </s-stack>
    </s-box>
  );
}
