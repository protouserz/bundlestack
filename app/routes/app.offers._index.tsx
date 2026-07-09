import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { redirect, useLoaderData, useSubmit } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { EmptyState } from "../components/EmptyState";
import { OfferCard } from "../components/OfferCard";
import {
  deleteAllOffers,
  deleteOffer,
  listOffers,
  removeOfferRecord,
} from "../models/bundle.server";
import { deleteShopifyDiscounts } from "../models/discount.server";
import { SButton, SPage } from "../components/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const offers = await listOffers(session.shop);
  return { offers };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const offerId = String(formData.get("offerId") ?? "");
    if (!offerId) {
      throw new Response("Missing offer ID", { status: 400 });
    }

    const offer = await deleteOffer(session.shop, offerId);
    await deleteShopifyDiscounts(admin, offer.discountIds);
    await removeOfferRecord(offerId);
    return redirect("/app/offers");
  }

  if (intent === "delete-all") {
    const offers = await deleteAllOffers(session.shop);
    const discountIds = offers.flatMap((offer) => offer.discountIds);
    await deleteShopifyDiscounts(admin, discountIds);
    return redirect("/app/offers");
  }

  throw new Response("Unknown action", { status: 400 });
};

export default function OffersIndex() {
  const { offers } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const handleDeleteAll = () => {
    submit({ intent: "delete-all" }, { method: "post" });
  };

  return (
    <SPage heading="Offers">
      <SButton slot="primary-action" variant="primary" href="/app/offers/new">
        Create offer
      </SButton>

      {offers.length > 0 && (
        <SButton
          slot="secondary-actions"
          tone="critical"
          variant="tertiary"
          command="--show"
          commandFor="delete-all-offers-modal"
        >
          Delete all
        </SButton>
      )}

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
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  showTiers
                  showDelete
                />
              ))}
            </s-stack>
          </s-section>
        )}
      </s-stack>

      {offers.length > 0 && (
        <s-modal id="delete-all-offers-modal" heading="Delete all offers?">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              This will permanently delete {offers.length} offer
              {offers.length === 1 ? "" : "s"} and remove all synced Shopify
              discounts. This action cannot be undone.
            </s-paragraph>
          </s-stack>

          <SButton
            slot="secondary-actions"
            variant="tertiary"
            commandFor="delete-all-offers-modal"
            command="--hide"
          >
            Cancel
          </SButton>
          <SButton
            slot="primary-action"
            variant="primary"
            tone="critical"
            onClick={handleDeleteAll}
          >
            Delete all
          </SButton>
        </s-modal>
      )}
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
