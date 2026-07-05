import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { EmptyState } from "../components/EmptyState";
import { OfferCard } from "../components/OfferCard";
import { listOffers } from "../models/bundle.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const offers = await listOffers(session.shop);
  return { offers };
};

export default function OffersIndex() {
  const { offers } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Offers">
      <s-button slot="primary-action" href="/app/offers/new">
        Create offer
      </s-button>

      <s-stack direction="block" gap="large">
        <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
          <s-text tone="neutral">
            Quantity-break offers encourage shoppers to buy more with tiered
            discounts — synced automatically as Shopify discounts at checkout.
          </s-text>
        </s-box>

        {offers.length === 0 ? (
          <EmptyState
            heading="No offers yet"
            description='Create your first offer — e.g. "Buy 2, save 10%" or "Buy 3, save 15%" — and assign it to products in your catalog.'
            actionLabel="Create offer"
            actionHref="/app/offers/new"
          />
        ) : (
          <s-section heading={`${offers.length} offer${offers.length === 1 ? "" : "s"}`}>
            <s-stack direction="block" gap="base">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} showTiers />
              ))}
            </s-stack>
          </s-section>
        )}
      </s-stack>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
