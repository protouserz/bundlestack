import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getBillingSummary } from "../billing.server";
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

function statusTone(status: "ok" | "warning" | "error") {
  if (status === "ok") return "success";
  if (status === "warning") return "warning";
  return "critical";
}

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
    <s-page heading="BundleStack">
      <s-button slot="primary-action" href="/app/offers/new">
        Create offer
      </s-button>

      <s-section heading="Store health">
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
            <s-box
              key={check.id}
              padding="base"
              borderWidth="base"
              borderRadius="base"
            >
              <s-stack direction="inline" gap="base">
                <s-badge tone={statusTone(check.status)}>{check.status}</s-badge>
                <s-heading>{check.label}</s-heading>
              </s-stack>
              <s-text tone="neutral">{check.message}</s-text>
              {check.fix && (check.status === "error" || check.status === "warning") && (
                <HealthCheckFixButton fix={check.fix} fetcher={fixFetcher} />
              )}
            </s-box>
          ))}
        </s-stack>
      </s-section>

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
            <s-heading>{billing.planLabel}</s-heading>
          </s-box>
        </s-stack>
        <s-paragraph>
          <Link to="/app/billing">View billing details & uninstall policy →</Link>
        </s-paragraph>
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
                  generated · {offer.discountIds.length} discount(s) synced
                </s-text>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
