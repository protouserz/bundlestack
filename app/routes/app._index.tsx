import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getBillingSummary } from "../billing.server";
import { DashboardMetrics } from "../components/dashboard/DashboardMetrics";
import { OffersTable } from "../components/dashboard/OffersTable";
import { RevenueChart } from "../components/dashboard/RevenueChart";
import { TopOffersList } from "../components/dashboard/TopOffersList";
import styles from "../components/dashboard/dashboard.module.css";
import {
  ensureShopSettings,
  getShopStats,
  listOffers,
} from "../models/bundle.server";
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
    offers,
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

function formatDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export default function Dashboard() {
  const { stats, billing, health, offers } = useLoaderData<typeof loader>();
  const fixFetcher = useFetcher<typeof action>();
  const fixResult = fixFetcher.data?.fixResult;
  const showHealthDetails =
    health.overall !== "healthy" || health.checks.some((c) => c.fix);

  return (
    <s-page>
      <s-button slot="primary-action" href="/app/offers/new">
        Create offer
      </s-button>

      <div className={styles.dashboard}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>Dashboard</h1>
            <p className={styles.headerSubtitle}>
              Overview of your BundleStack performance
            </p>
          </div>
          <div className={styles.dateBadge} aria-label="Reporting period">
            <span aria-hidden="true">📅</span>
            {formatDateRange()}
          </div>
        </header>

        {stats.totalOffers === 0 && (
          <div className={styles.welcomeBanner}>
            <s-stack direction="block" gap="base">
              <s-heading>Welcome to BundleStack</s-heading>
              <s-text tone="neutral">
                Create your first quantity-break offer, add the theme widget, and
                start turning single-item orders into bigger carts.
              </s-text>
              <s-stack direction="inline" gap="base">
                <s-button href="/app/offers/new">Create your first offer</s-button>
                <s-button href="/app/billing" variant="tertiary">
                  View pricing
                </s-button>
              </s-stack>
            </s-stack>
          </div>
        )}

        <DashboardMetrics
          activeOffers={stats.activeOffers}
          totalOffers={stats.totalOffers}
          revenue={stats.totalRevenue}
          health={health}
        />

        <div className={styles.midRow}>
          <RevenueChart offers={offers} />
          <TopOffersList offers={offers} />
        </div>

        <OffersTable offers={offers} />

        {showHealthDetails && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>System checks</h2>

            {fixResult && (
              <s-banner tone={fixResult.success ? "success" : "critical"}>
                {fixResult.message}
              </s-banner>
            )}

            <div className={styles.healthChecks}>
              {health.checks.map((check) => (
                <div key={check.id} className={styles.healthCheckRow}>
                  <div className={styles.healthCheckMeta}>
                    <p className={styles.healthCheckLabel}>{check.label}</p>
                    <p className={styles.healthCheckMessage}>{check.message}</p>
                  </div>
                  <s-stack direction="inline" gap="base">
                    <s-badge
                      tone={
                        check.status === "ok"
                          ? "success"
                          : check.status === "warning"
                            ? "warning"
                            : "critical"
                      }
                    >
                      {check.status}
                    </s-badge>
                    {check.fix ? (
                      <HealthCheckFixButton
                        fix={check.fix}
                        fetcher={fixFetcher}
                      />
                    ) : null}
                  </s-stack>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={styles.metricSubtext}>
          Current plan: <strong>{billing.planLabel}</strong>
          {billing.monthlyPrice > 0
            ? ` · $${billing.monthlyPrice.toFixed(2)}/mo`
            : " · Free tier"}
          {" · "}
          <Link className={styles.panelLink} to="/app/billing">
            View billing details
          </Link>
        </p>
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
