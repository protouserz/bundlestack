import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <s-box padding="large" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="base">
        <s-text tone="neutral">{label}</s-text>
        <s-heading>{value}</s-heading>
      </s-stack>
    </s-box>
  );
}

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
            <s-text>
              <span style={{ fontSize: "1.75rem", fontWeight: 600 }}>
                {formatPlanPrice(plan)}
              </span>
            </s-text>
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
              }}
            >
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
                      <div
                        role="progressbar"
                        aria-valuenow={billing.progressToNextTier}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        style={{
                          height: "8px",
                          borderRadius: "4px",
                          background: "var(--p-color-bg-fill-secondary, #e3e3e3)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${billing.progressToNextTier}%`,
                            borderRadius: "4px",
                            background:
                              "var(--p-color-bg-fill-success, #008060)",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
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
              Performance-based pricing — free to start, then pay less than
              leading bundle apps at every tier. Kaching charges $29.99/mo for
              $5k revenue; BundleStack Growth is $14.99.
            </s-paragraph>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "20px",
              }}
            >
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
                <s-text tone="neutral">How billing works</s-text>
                <s-unordered-list>
                  <s-list-item>
                    Free forever until your store generates $500/mo through
                    BundleStack offers
                  </s-list-item>
                  <s-list-item>
                    Tiers upgrade automatically when revenue crosses each
                    threshold — no manual plan picking required
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

            <s-box padding="large" borderWidth="base" borderRadius="base">
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
