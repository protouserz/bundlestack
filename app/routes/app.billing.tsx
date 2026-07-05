import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import styles from "../components/ui.module.css";
import {
  formatPlanPrice,
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_ORDER,
  PLAN_REVENUE_CAPS,
  type BillingPlan,
} from "../billing.plans";
import { getBillingSummary } from "../billing.server";
import { getShopStats } from "../models/bundle.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const stats = await getShopStats(session.shop);
  const billing = getBillingSummary(stats.totalRevenue);
  const shopHandle = session.shop.replace(".myshopify.com", "");

  return {
    billing,
    themeEditorUrl: `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps`,
  };
};

function PlanCard({
  plan,
  isCurrent,
}: {
  plan: BillingPlan;
  isCurrent: boolean;
}) {
  const features = PLAN_FEATURES[plan];

  return (
    <s-box
      padding="large"
      borderWidth="base"
      borderRadius="base"
      background={isCurrent ? "subdued" : undefined}
    >
      <s-stack direction="block" gap="large">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base">
            <s-heading>{PLAN_LABELS[plan]}</s-heading>
            {isCurrent && <s-badge tone="success">Current plan</s-badge>}
          </s-stack>
          <s-stack direction="inline" gap="base">
            <span className={styles.priceLarge}>{formatPlanPrice(plan)}</span>
            <s-text tone="neutral">/ month</s-text>
          </s-stack>
          <s-text tone="neutral">{PLAN_REVENUE_CAPS[plan]}</s-text>
        </s-stack>

        <s-stack direction="block" gap="base">
          {features.map((feature) => (
            <s-text key={feature}>✓ {feature}</s-text>
          ))}
        </s-stack>
      </s-stack>
    </s-box>
  );
}

export default function BillingPage() {
  const { billing, themeEditorUrl } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Billing & uninstall">
      <s-stack direction="block" gap="large">
        <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
          <s-text tone="neutral">
            Performance-based pricing — free to start, upgrade only when
            BundleStack generates more revenue for your store.
          </s-text>
        </s-box>

        <s-section heading="Current plan">
          <s-stack direction="block" gap="large">
            {billing.alertAtEightyPercent && (
              <s-banner tone="warning">
                You are at {billing.progressToNextTier}% toward the{" "}
                {billing.nextPlanLabel} plan ({formatPlanPrice(billing.nextPlan!)}/
                mo). Tiers upgrade automatically when BundleStack generates more
                revenue — you only pay more when the app earns more for you.
              </s-banner>
            )}

            <div className={styles.gridStats}>
              <StatCard label="Plan" value={billing.planLabel} />
              <StatCard
                label="Monthly price"
                value={
                  billing.monthlyPrice === 0
                    ? "$0.00"
                    : `$${billing.monthlyPrice.toFixed(2)}`
                }
              />
              <StatCard
                label="Revenue generated"
                value={`$${billing.revenueGenerated.toFixed(2)}`}
              />
            </div>

            {billing.nextPlan && billing.revenueUntilNextTier !== null && (
              <s-box padding="large" borderWidth="base" borderRadius="base">
                <s-stack direction="block" gap="base">
                  <s-text>
                    Next tier: {billing.nextPlanLabel} (
                    {formatPlanPrice(billing.nextPlan)}/mo)
                  </s-text>
                  {billing.revenueUntilNextTier > 0 ? (
                    <>
                      <s-text tone="neutral">
                        ${billing.revenueUntilNextTier.toFixed(2)} more app revenue
                        until upgrade · {billing.progressToNextTier}% there
                      </s-text>
                      <ProgressBar value={billing.progressToNextTier} />
                    </>
                  ) : (
                    <s-text tone="neutral">
                      You qualify for the highest tier based on app revenue.
                    </s-text>
                  )}
                </s-stack>
              </s-box>
            )}
          </s-stack>
        </s-section>

        <s-section heading="Pricing plans">
          <s-stack direction="block" gap="large">
            <s-paragraph>
              Pay less than leading bundle apps at every tier — Growth is $14.99
              for up to $5k revenue vs $29.99 elsewhere.
            </s-paragraph>

            <div className={styles.gridCards}>
              {PLAN_ORDER.map((plan) => (
                <PlanCard
                  key={plan}
                  plan={plan}
                  isCurrent={billing.plan === plan}
                />
              ))}
            </div>

            <s-box padding="large" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>How billing works</s-heading>
                <s-unordered-list>
                  <s-list-item>
                    Free until your store generates $500/mo through BundleStack
                    offers
                  </s-list-item>
                  <s-list-item>
                    Tiers upgrade automatically when revenue crosses each
                    threshold
                  </s-list-item>
                  <s-list-item>
                    Shopify bills on a 30-day cycle; uninstalling stops new
                    charges immediately
                  </s-list-item>
                </s-unordered-list>
              </s-stack>
            </s-box>
          </s-stack>
        </s-section>

        <s-section heading="Clean uninstall guarantee">
          <s-stack direction="block" gap="large">
            <s-paragraph>
              When you uninstall BundleStack, we automatically remove all
              discount rules created by the app and delete your offer data. No
              ghost code, no hidden blocks.
            </s-paragraph>

            <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
              <s-stack direction="block" gap="base">
                <s-text>✓ All BundleStack automatic discounts are deleted</s-text>
                <s-text>✓ Offer configuration is removed from our database</s-text>
                <s-text>
                  ✓ Remove the theme block:{" "}
                  <Link to={themeEditorUrl} target="_blank" rel="noreferrer">
                    Open theme editor
                  </Link>
                </s-text>
              </s-stack>
            </s-box>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
