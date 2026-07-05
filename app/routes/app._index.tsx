import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getBillingSummary } from "../billing.server";
import { EmptyState } from "../components/EmptyState";
import { HealthCheckCard } from "../components/HealthCheckCard";
import { OfferCard } from "../components/OfferCard";
import { StatCard } from "../components/StatCard";
import styles from "../components/ui.module.css";
import { ensureShopSettings, getShopStats, listOffers } from "../models/bundle.server";
import {
  getShopHealth,
  syncAllActiveOfferDiscounts,
  type HealthFixAction,
} from "../models/health.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  await ensureShopSettings(shop);

  const [stats, offers, health] = await Promise.all([
    getShopStats(shop),
    listOffers(shop),
    getShopHealth(admin, shop),
  ]);

  const billing = getBillingSummary(stats.totalRevenue);

  return {
    stats,
    billing,
    health,
    offers: offers.slice(0, 5),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sync-discounts") {
    const { synced, failed } = await syncAllActiveOfferDiscounts(
      admin,
      session.shop,
    );

    if (failed.length > 0) {
      return {
        fixResult: {
          success: false,
          message: `Synced ${synced} offer(s). Failed: ${failed.join("; ")}`,
        },
      };
    }

    return {
      fixResult: {
        success: true,
        message: `Synced discounts for ${synced} active offer(s).`,
      },
    };
  }

  return null;
};

function HealthCheckFixButton({
  fix,
  fetcher,
}: {
  fix: HealthFixAction;
  fetcher: ReturnType<typeof useFetcher<typeof action>>;
}) {
  const isLoading = fetcher.state !== "idle";

  if (fix.href) {
    return (
      <s-button href={fix.href} target={fix.external ? "_blank" : undefined}>
        Try to fix
      </s-button>
    );
  }

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value={fix.intent} />
      <s-button type="submit" {...(isLoading ? { loading: true } : {})}>
        Try to fix
      </s-button>
    </fetcher.Form>
  );
}

export default function Dashboard() {
  const { stats, billing, health, offers } = useLoaderData<typeof loader>();
  const fixFetcher = useFetcher<typeof action>();
  const fixResult = fixFetcher.data?.fixResult;

  return (
    <s-page heading="Dashboard">
      <s-button slot="primary-action" href="/app/offers/new">
        Create offer
      </s-button>

      <s-stack direction="block" gap="large">
        {stats.totalOffers === 0 && (
          <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
            <s-stack direction="block" gap="large">
              <s-stack direction="block" gap="base">
                <s-heading>Welcome to BundleStack</s-heading>
                <s-text tone="neutral">
                  Create your first quantity-break offer, add the theme widget, and
                  start turning single-item orders into bigger carts.
                </s-text>
              </s-stack>
              <s-stack direction="inline" gap="base">
                <s-button href="/app/offers/new">Create your first offer</s-button>
                <s-button href="/app/billing" variant="tertiary">
                  View pricing
                </s-button>
              </s-stack>
            </s-stack>
          </s-box>
        )}

        <s-section heading="Overview">
          <s-stack direction="block" gap="large">
            <div className={styles.gridStats}>
              <StatCard label="Active offers" value={String(stats.activeOffers)} />
              <StatCard label="Total offers" value={String(stats.totalOffers)} />
              <StatCard
                label="Revenue generated"
                value={`$${stats.totalRevenue.toFixed(2)}`}
              />
              <StatCard
                label="Current plan"
                value={billing.planLabel}
                hint={
                  billing.monthlyPrice > 0
                    ? `$${billing.monthlyPrice.toFixed(2)}/mo`
                    : "Free tier"
                }
              />
            </div>
            <s-paragraph>
              <Link to="/app/billing">View billing details & uninstall policy →</Link>
            </s-paragraph>
          </s-stack>
        </s-section>

        <s-section heading="Store health">
          <s-stack direction="block" gap="large">
            {fixResult && (
              <s-banner tone={fixResult.success ? "success" : "critical"}>
                {fixResult.message}
              </s-banner>
            )}

            <s-banner
              tone={
                health.overall === "healthy"
                  ? "success"
                  : health.overall === "attention"
                    ? "warning"
                    : "critical"
              }
            >
              {health.overall === "healthy"
                ? "All systems operational"
                : health.overall === "attention"
                  ? "Needs attention — review checks below"
                  : "Action required — offers may not be working"}
            </s-banner>

            <s-stack direction="block" gap="base">
              {health.checks.map((check) => (
                <HealthCheckCard
                  key={check.id}
                  id={check.id}
                  label={check.label}
                  status={check.status}
                  message={check.message}
                  fix={check.fix}
                  fixButton={
                    check.fix ? (
                      <HealthCheckFixButton fix={check.fix} fetcher={fixFetcher} />
                    ) : undefined
                  }
                />
              ))}
            </s-stack>
          </s-stack>
        </s-section>

        <s-section heading="Recent offers">
          {offers.length === 0 ? (
            <EmptyState
              heading="No offers yet"
              description='Create quantity breaks like "Buy 2, save 10%" to boost average order value on your product pages.'
              actionLabel="Create offer"
              actionHref="/app/offers/new"
            />
          ) : (
            <s-stack direction="block" gap="base">
              {offers.map((offer) => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
              <s-paragraph>
                <Link to="/app/offers">View all offers →</Link>
              </s-paragraph>
            </s-stack>
          )}
        </s-section>
      </s-stack>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
