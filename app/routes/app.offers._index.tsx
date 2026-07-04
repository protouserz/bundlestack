import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listOffers } from "../models/bundle.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const offers = await listOffers(session.shop);
  return { offers };
};

export default function OffersIndex() {
  const { offers } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Bundle offers">
      <s-button slot="primary-action" href="/app/offers/new">
        Create offer
      </s-button>

      {offers.length === 0 ? (
        <s-section>
          <s-paragraph>
            No offers yet. Create quantity breaks like &quot;Buy 2, save 10%&quot; or
            &quot;Buy 3, save 15%&quot; to boost AOV.
          </s-paragraph>
        </s-section>
      ) : (
        <s-section>
          <s-stack direction="block" gap="base">
            {offers.map((offer) => (
              <s-box
                key={offer.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="inline" gap="base">
                  <s-heading>{offer.title}</s-heading>
                  <s-badge tone={offer.status === "active" ? "success" : "info"}>
                    {offer.status}
                  </s-badge>
                </s-stack>
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
                <s-stack direction="inline" gap="base">
                  <Link to={`/app/offers/${offer.id}`}>Edit</Link>
                  <s-text tone="neutral">
                    ${offer.revenueGenerated.toFixed(2)} generated
                  </s-text>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
