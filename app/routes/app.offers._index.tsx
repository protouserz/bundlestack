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
import { useI18n } from "../i18n/I18nProvider";

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
  const { t, plural } = useI18n();

  const handleDeleteAll = () => {
    submit({ intent: "delete-all" }, { method: "post" });
  };

  return (
    <SPage heading={t("offers.title")}>
      <SButton slot="primary-action" variant="primary" href="/app/offers/new">
        {t("offers.create")}
      </SButton>

      <s-stack direction="block" gap="large">
        <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
          <s-stack direction="inline" gap="base">
            <s-text tone="neutral">
              {t("offers.intro")}
            </s-text>
            {offers.length > 0 && (
              <SButton
                variant="secondary"
                tone="critical"
                command="--show"
                commandFor="delete-all-offers-modal"
              >
                {t("common.deleteAll")}
              </SButton>
            )}
          </s-stack>
        </s-box>

        {offers.length === 0 ? (
          <EmptyState
            heading={t("offers.emptyHeading")}
            description={t("offers.emptyBody")}
            actionLabel={t("offers.create")}
            actionHref="/app/offers/new"
          />
        ) : (
          <s-section heading={plural("offers.count", offers.length)}>
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
        <s-modal
          id="delete-all-offers-modal"
          heading={t("offers.deleteAllTitle")}
          accessibilityLabel={t("offers.deleteAllA11y")}
        >
          <s-stack direction="block" gap="base">
            <s-paragraph>
              {t("offers.deleteAllBody", { count: offers.length })}
            </s-paragraph>
          </s-stack>

          <SButton
            slot="secondary-actions"
            variant="secondary"
            commandFor="delete-all-offers-modal"
            command="--hide"
          >
            {t("common.cancel")}
          </SButton>
          <SButton
            slot="primary-action"
            variant="primary"
            tone="critical"
            onClick={handleDeleteAll}
          >
            {t("common.deleteAll")}
          </SButton>
        </s-modal>
      )}
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
