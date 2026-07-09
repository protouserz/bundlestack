import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, redirect, useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getBillingSummary, isBillingPlan } from "../billing.server";
import { DashboardMetrics } from "../components/dashboard/DashboardMetrics";
import { OffersTable } from "../components/dashboard/OffersTable";
import { RevenueChart } from "../components/dashboard/RevenueChart";
import { ThemeWidgetStatus } from "../components/dashboard/ThemeWidgetStatus";
import { TopOffersList } from "../components/dashboard/TopOffersList";
import styles from "../components/dashboard/dashboard.module.css";
import {
  ensureShopSettings,
  getShopSettings,
  getShopStats,
  listOffers,
  resolveCurrentBillingPlan,
  setOnboardingDone,
  setShopBillingPlan,
} from "../models/bundle.server";
import {
  getShopHealth,
  syncAllActiveOfferDiscounts,
  type HealthFixAction,
} from "../models/health.server";
import { syncDiscountUsesForShop } from "../models/usage.server";
import { SButton, SPage } from "../components/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  await ensureShopSettings(shop);

  const offers = await listOffers(shop);

  const [settings, health, stats] = await Promise.all([
    getShopSettings(shop),
    getShopHealth(admin, shop, offers),
    getShopStats(shop, offers),
  ]);

  if (stats.totalOffers > 0 && !settings.onboardingDone) {
    await setOnboardingDone(shop, true);
    settings.onboardingDone = true;
  }

  const requestUrl = new URL(request.url);
  const hasBillingCallback =
    requestUrl.searchParams.has("plan_handle") ||
    requestUrl.searchParams.has("charge_id");
  const storedPlan = isBillingPlan(settings.billingPlan)
    ? settings.billingPlan
    : "free";
  let currentPlan = storedPlan;

  if (hasBillingCallback) {
    const billingCheck = await billing.check();
    const activeSubscriptionNames = billingCheck.appSubscriptions
      .filter((subscription) => subscription.status === "ACTIVE")
      .map((subscription) => subscription.name);

    currentPlan = resolveCurrentBillingPlan({
      activeSubscriptionNames,
      planHandle: requestUrl.searchParams.get("plan_handle"),
      chargeId: requestUrl.searchParams.get("charge_id"),
      storedPlan,
    });

    if (currentPlan !== settings.billingPlan) {
      await setShopBillingPlan(shop, currentPlan);
    }

    if (activeSubscriptionNames.length > 0 && settings.pendingBillingPlan) {
      const { clearPendingBillingPlan } = await import("../models/bundle.server");
      await clearPendingBillingPlan(shop);
    }
  }

  const billingSummary = getBillingSummary(
    currentPlan,
    stats.totalDiscountUses,
  );

  return {
    stats,
    billing: billingSummary,
    health,
    offers,
    onboardingDone: settings.onboardingDone,
    themeEditorUrl: health.themeEditorUrl,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "sync-discounts") {
    const { synced, failed, skipped } = await syncAllActiveOfferDiscounts(
      admin,
      session.shop,
    );

    if (failed.length > 0 || synced === 0) {
      const parts = [
        ...failed,
        ...skipped,
        synced === 0 && failed.length === 0
          ? "No offers were synchronized."
          : null,
      ].filter(Boolean);

      return {
        fixResult: {
          success: false,
          message:
            synced > 0
              ? `Synced ${synced} offer(s). Issues: ${parts.join("; ")}`
              : parts.join("; "),
        },
      };
    }

    return redirect("/app");
  }

  if (intent === "refresh-stats") {
    await syncDiscountUsesForShop(admin, session.shop);
    return redirect("/app");
  }

  if (intent === "dismiss-onboarding") {
    await setOnboardingDone(session.shop, true);
    return redirect("/app");
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
      <SButton href={fix.href} target={fix.external ? "_blank" : undefined}>
        Try to fix
      </SButton>
    );
  }

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value={fix.intent} />
      <SButton type="submit" {...(isLoading ? { loading: true } : {})}>
        Try to fix
      </SButton>
    </fetcher.Form>
  );
}

function formatDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export default function Dashboard() {
  const { stats, billing, health, offers, onboardingDone, themeEditorUrl } =
    useLoaderData<typeof loader>();
  const fixFetcher = useFetcher<typeof action>();
  const onboardingFetcher = useFetcher<typeof action>();
  const statsFetcher = useFetcher<typeof action>();
  const fixResult = fixFetcher.data?.fixResult;
  const showHealthDetails =
    health.overall !== "healthy" || health.checks.some((c) => c.fix);
  const showWelcome = !onboardingDone && stats.totalOffers === 0;

  return (
    <SPage heading="Dashboard">
      <SButton slot="primary-action" variant="primary" href="/app/offers/new">
        Create offer
      </SButton>

      <div className={styles.dashboard}>
        <s-text tone="neutral">
          Reporting period: {formatDateRange()}
        </s-text>

        {showWelcome && (
          <s-banner tone="info">
            <s-stack direction="block" gap="base">
              <s-heading>Welcome to BundleStack</s-heading>
              <s-text tone="neutral">
                Create your first quantity-break offer, add the theme widget, and
                start turning single-item orders into bigger carts.
              </s-text>
              <s-stack direction="inline" gap="base">
                <SButton href="/app/offers/new">Create your first offer</SButton>
                <SButton href="/app/billing" variant="tertiary">
                  View pricing
                </SButton>
                <onboardingFetcher.Form method="post">
                  <input type="hidden" name="intent" value="dismiss-onboarding" />
                  <SButton type="submit" variant="tertiary">
                    Dismiss
                  </SButton>
                </onboardingFetcher.Form>
              </s-stack>
            </s-stack>
          </s-banner>
        )}

        <ThemeWidgetStatus themeEditorUrl={themeEditorUrl} />

        <DashboardMetrics
          activeOffers={stats.activeOffers}
          totalOffers={stats.totalOffers}
          discountUses={stats.totalDiscountUses}
          health={health}
        />

        <statsFetcher.Form method="post">
          <input type="hidden" name="intent" value="refresh-stats" />
          <SButton
            type="submit"
            variant="tertiary"
            {...(statsFetcher.state !== "idle" ? { loading: true } : {})}
          >
            Refresh redemption stats
          </SButton>
        </statsFetcher.Form>

        <div className={styles.midRow}>
          <RevenueChart offers={offers} />
          <TopOffersList offers={offers} />
        </div>

        <OffersTable offers={offers} />

        {showHealthDetails && (
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>System checks</h2>

            {fixResult && (
              <div className={styles.healthFixBanner}>
                <s-banner tone={fixResult.success ? "success" : "critical"}>
                  {fixResult.message}
                </s-banner>
              </div>
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
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
