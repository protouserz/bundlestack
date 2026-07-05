import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, Link, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import styles from "../components/ui.module.css";
import {
  getShopifyPlanForTier,
  isBillingTestMode,
  SHOPIFY_BILLING_PLANS,
} from "../billing.shopify";
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
  const { session, billing } = await authenticate.admin(request);
  const stats = await getShopStats(session.shop);
  const billingSummary = getBillingSummary(stats.totalRevenue);
  const shopHandle = session.shop.replace(".myshopify.com", "");
  const requiredShopifyPlan = getShopifyPlanForTier(billingSummary.plan);

  const billingCheck = await billing.check();
  const activeSubscriptionNames = billingCheck.appSubscriptions.map(
    (subscription) => subscription.name,
  );
  const hasActiveShopifySubscription =
    requiredShopifyPlan === null ||
    activeSubscriptionNames.includes(requiredShopifyPlan);
  const needsSubscriptionApproval =
    requiredShopifyPlan !== null && !hasActiveShopifySubscription;

  return {
    billing: billingSummary,
    activeSubscriptionNames,
    hasActiveShopifySubscription,
    needsSubscriptionApproval,
    requiredShopifyPlan,
    billingTestMode: isBillingTestMode(),
    themeEditorUrl: `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps`,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = formData.get("plan");
  const allowedPlans = new Set<string>(Object.values(SHOPIFY_BILLING_PLANS));

  if (typeof plan !== "string" || !allowedPlans.has(plan)) {
    throw new Response("Invalid billing plan", { status: 400 });
  }

  const appUrl = process.env.SHOPIFY_APP_URL || new URL(request.url).origin;

  return billing.request({
    plan: plan as (typeof SHOPIFY_BILLING_PLANS)[keyof typeof SHOPIFY_BILLING_PLANS],
    isTest: isBillingTestMode(),
    returnUrl: `${appUrl}/app/billing`,
  });
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
  const {
    billing,
    activeSubscriptionNames,
    needsSubscriptionApproval,
    requiredShopifyPlan,
    billingTestMode,
    themeEditorUrl,
  } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Billing & uninstall">
      <s-stack direction="block" gap="large">
        <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
          <s-text tone="neutral">
            Performance-based pricing — free to start, upgrade only when
            BundleStack generates more revenue for your store. Paid tiers are
            billed through Shopify on a 30-day cycle.
          </s-text>
        </s-box>

        {needsSubscriptionApproval && requiredShopifyPlan && (
          <s-banner tone="warning">
            <s-stack direction="block" gap="base">
              <s-text>
                Your store qualifies for the {billing.planLabel} plan (
                {formatPlanPrice(billing.plan)}/mo). Approve the subscription
                in Shopify to continue on this tier.
              </s-text>
              <Form method="post">
                <input type="hidden" name="plan" value={requiredShopifyPlan} />
                <s-button type="submit" variant="primary">
                  Approve {billing.planLabel} in Shopify
                </s-button>
              </Form>
              {billingTestMode && (
                <s-text tone="neutral">
                  Test billing mode is on — charges appear as test subscriptions
                  on development stores.
                </s-text>
              )}
            </s-stack>
          </s-banner>
        )}

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

            {activeSubscriptionNames.length > 0 && (
              <s-box padding="large" borderWidth="base" borderRadius="base">
                <s-stack direction="block" gap="base">
                  <s-heading>Shopify subscription</s-heading>
                  {activeSubscriptionNames.map((name) => (
                    <s-text key={name}>Active: {name}</s-text>
                  ))}
                </s-stack>
              </s-box>
            )}

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
                    When you qualify for a paid tier, approve the charge in
                    Shopify — billing runs on a 30-day cycle
                  </s-list-item>
                  <s-list-item>
                    Uninstalling stops new charges immediately
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
