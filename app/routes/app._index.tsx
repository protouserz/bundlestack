import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { ensureShopSettings, getShopStats, listOffers } from "../models/bundle.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  await ensureShopSettings(shop);

  const [stats, offers] = await Promise.all([
    getShopStats(shop),
    listOffers(shop),
  ]);

  return { stats, offers: offers.slice(0, 5) };
};

export default function Dashboard() {
  const { stats, offers } = useLoaderData<typeof loader>();

  return (
    <s-page heading="BundleStack">
      <s-button slot="primary-action" href="/app/offers/new">
        Create offer
      </s-button>

      <s-section heading="Overview">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text tone="neutral">Active offers</s-text>
            <s-heading>{stats.activeOffers}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text tone="neutral">Total offers</s-text>
            <s-heading>{stats.totalOffers}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text tone="neutral">Revenue generated</s-text>
            <s-heading>${stats.totalRevenue.toFixed(2)}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text tone="neutral">Current plan</s-text>
            <s-heading>{stats.billingPlan}</s-heading>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="Quick start">
        <s-paragraph>
          BundleStack helps you increase average order value with quantity breaks
          and bundle discounts — the same playbook used by apps doing $4M+ ARR on
          Shopify.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>Create a quantity break offer for your best-selling product</s-list-item>
          <s-list-item>Activate it and add the theme block to your product page</s-list-item>
          <s-list-item>Track revenue generated directly in this dashboard</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Recent offers">
        {offers.length === 0 ? (
          <s-paragraph>
            No offers yet.{" "}
            <Link to="/app/offers/new">Create your first quantity break</Link>.
          </s-paragraph>
        ) : (
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
                  <Link to={`/app/offers/${offer.id}`}>Edit</Link>
                </s-stack>
                <s-text tone="neutral">
                  {offer.tiers.length} tier(s) · ${offer.revenueGenerated.toFixed(2)}{" "}
                  generated
                </s-text>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Pricing (Kaching playbook)">
        <s-unordered-list>
          <s-list-item>Free — launch & get reviews</s-list-item>
          <s-list-item>$14.99/mo — until $1K revenue generated</s-list-item>
          <s-list-item>$29.99/mo — until $5K revenue generated</s-list-item>
          <s-list-item>$59.99/mo — unlimited scale</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
