import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { StatCard } from "../components/StatCard";
import styles from "../components/ui.module.css";
import {
  billingReturnUrl,
  formatBillingError,
  rethrowIfResponse,
  resolveBillingTestMode,
} from "../billing-session.server";
import {
  getShopifyPlanForTier,
  getTierForShopifyPlan,
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
import { getBillingSummary, isBillingPlan } from "../billing.server";
import {
  clearPendingBillingPlan,
  getShopSettings,
  getShopStats,
  resolveBillingPlan,
  resolvePendingBillingPlan,
  setPendingBillingPlan,
  setShopBillingPlan,
} from "../models/bundle.server";

type BillingContext = Awaited<ReturnType<typeof authenticate.admin>>;

async function requestPaidPlan(
  { billing, admin, session }: BillingContext,
  request: Request,
  plan: Exclude<BillingPlan, "free">,
) {
  const shopifyPlan = getShopifyPlanForTier(plan);
  if (!shopifyPlan) {
    throw new Error("Invalid billing plan selected.");
  }

  const isTest = await resolveBillingTestMode(admin);
  await setPendingBillingPlan(session.shop, plan);
  await billing.request({
    plan: shopifyPlan,
    isTest,
    returnUrl: billingReturnUrl(request),
  });
}

async function loadBillingPage(request: Request, billingContext: BillingContext) {
  const { session, billing, admin } = billingContext;
  const requestUrl = new URL(request.url);

  const [stats, settings, billingTestMode] = await Promise.all([
    getShopStats(session.shop),
    getShopSettings(session.shop),
    resolveBillingTestMode(admin),
  ]);

  const billingCheck = await billing.check();
  const activeSubscriptions = billingCheck.appSubscriptions.filter(
    (subscription) => subscription.status === "ACTIVE",
  );
  const activeSubscriptionNames = activeSubscriptions.map(
    (subscription) => subscription.name,
  );

  const currentPlan = resolveBillingPlan(activeSubscriptionNames);
  const pendingPlan = resolvePendingBillingPlan(settings.pendingBillingPlan);

  if (currentPlan !== settings.billingPlan) {
    await setShopBillingPlan(session.shop, currentPlan);
  }

  if (requestUrl.searchParams.has("charge_id") && activeSubscriptionNames.length > 0) {
    await clearPendingBillingPlan(session.shop);
  } else if (activeSubscriptionNames.length > 0 && settings.pendingBillingPlan) {
    await clearPendingBillingPlan(session.shop);
  }

  const billingSummary = getBillingSummary(
    currentPlan,
    stats.totalDiscountUses,
  );
  const shopHandle = session.shop.replace(".myshopify.com", "");
  const pendingShopifyPlan = pendingPlan ? getShopifyPlanForTier(pendingPlan) : null;
  const hasActiveShopifySubscription = activeSubscriptionNames.some((name) =>
    Object.values(SHOPIFY_BILLING_PLANS).includes(
      name as (typeof SHOPIFY_BILLING_PLANS)[keyof typeof SHOPIFY_BILLING_PLANS],
    ),
  );
  const needsSubscriptionApproval =
    pendingPlan !== null &&
    pendingShopifyPlan !== null &&
    !activeSubscriptionNames.includes(pendingShopifyPlan);
  const billingError = requestUrl.searchParams.get("billing_error");

  return {
    billing: billingSummary,
    pendingPlan,
    activeSubscriptions,
    activeSubscriptionNames,
    hasActiveShopifySubscription,
    needsSubscriptionApproval,
    pendingShopifyPlan,
    billingTestMode,
    billingError,
    themeEditorUrl: `https://admin.shopify.com/store/${shopHandle}/themes/current/editor?context=apps`,
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const billingContext = await authenticate.admin(request);
  const requestUrl = new URL(request.url);

  if (requestUrl.searchParams.has("subscribe")) {
    const params = new URLSearchParams(requestUrl.searchParams);
    params.delete("subscribe");
    const query = params.toString();
    throw redirect(query ? `/app/billing?${query}` : "/app/billing");
  }

  return loadBillingPage(request, billingContext);
};

async function cancelActiveSubscriptions(
  billing: BillingContext["billing"],
  isTest: boolean,
) {
  const billingCheck = await billing.check();

  for (const subscription of billingCheck.appSubscriptions) {
    if (subscription.status !== "ACTIVE") continue;
    await billing.cancel({
      subscriptionId: subscription.id,
      isTest,
      prorate: true,
    });
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const billingContext = await authenticate.admin(request);
  const { billing, session, admin } = billingContext;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const isTest = await resolveBillingTestMode(admin);

  if (intent === "cancel") {
    await cancelActiveSubscriptions(billing, isTest);
    await setShopBillingPlan(session.shop, "free");
    await clearPendingBillingPlan(session.shop);
    return redirect("/app/billing");
  }

  if (intent === "subscribe") {
    const planValue = String(formData.get("plan") ?? "");
    if (!isBillingPlan(planValue)) {
      return { error: "Invalid billing plan selected." };
    }

    const plan = planValue as BillingPlan;

    if (plan === "free") {
      await cancelActiveSubscriptions(billing, isTest);
      await setShopBillingPlan(session.shop, "free");
      await clearPendingBillingPlan(session.shop);
      return redirect("/app/billing");
    }

    try {
      await requestPaidPlan(billingContext, request, plan);
    } catch (error) {
      rethrowIfResponse(error);
      return { error: formatBillingError(error) };
    }
  }

  const legacyPlan = formData.get("plan");
  const allowedPlans = new Set<string>(Object.values(SHOPIFY_BILLING_PLANS));
  if (typeof legacyPlan === "string" && allowedPlans.has(legacyPlan)) {
    const tier = getTierForShopifyPlan(legacyPlan);
    if (tier) {
      try {
        await requestPaidPlan(billingContext, request, tier);
      } catch (error) {
        rethrowIfResponse(error);
        return { error: formatBillingError(error) };
      }
    }
  }

  return { error: "Invalid billing action." };
};

function PlanCard({
  plan,
  currentPlan,
  hasActiveSubscription,
}: {
  plan: BillingPlan;
  currentPlan: BillingPlan;
  hasActiveSubscription: boolean;
}) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const features = PLAN_FEATURES[plan];
  const isCurrent =
    plan === currentPlan &&
    (plan === "free" || hasActiveSubscription);
  const planIndex = PLAN_ORDER.indexOf(plan);
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  const isUpgrade = planIndex > currentIndex;
  const isBusy = navigation.state !== "idle";

  const buttonLabel =
    plan === "free"
      ? "Switch to Free"
      : isUpgrade
        ? `Upgrade to ${PLAN_LABELS[plan]}`
        : `Downgrade to ${PLAN_LABELS[plan]}`;

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

        {!isCurrent && plan === "free" && (
          <s-button
            type="button"
            variant="tertiary"
            {...(isBusy ? { loading: true } : {})}
            onClick={() =>
              submit({ intent: "subscribe", plan: "free" }, { method: "post" })
            }
          >
            {buttonLabel}
          </s-button>
        )}

        {!isCurrent && plan !== "free" && (
          <s-button
            type="button"
            variant={isUpgrade ? "primary" : "tertiary"}
            {...(isBusy ? { loading: true } : {})}
            onClick={() =>
              submit({ intent: "subscribe", plan }, { method: "post" })
            }
          >
            {buttonLabel}
          </s-button>
        )}

        {isCurrent && plan !== "free" && hasActiveSubscription && (
          <s-button
            type="button"
            variant="tertiary"
            {...(isBusy ? { loading: true } : {})}
            onClick={() => submit({ intent: "cancel" }, { method: "post" })}
          >
            Cancel paid subscription
          </s-button>
        )}
      </s-stack>
    </s-box>
  );
}

function PendingApprovalBanner({
  pendingPlan,
  currentPlanLabel,
  billingTestMode,
}: {
  pendingPlan: BillingPlan;
  currentPlanLabel: string;
  billingTestMode: boolean;
}) {
  const submit = useSubmit();

  return (
    <s-banner tone="warning">
      <s-stack direction="block" gap="base">
        <s-text>
          Approve the {PLAN_LABELS[pendingPlan]} plan (
          {formatPlanPrice(pendingPlan)}/mo) in Shopify to activate billing. Your
          current plan stays {currentPlanLabel} until approval is complete.
        </s-text>
        <s-button
          type="button"
          variant="primary"
          onClick={() =>
            submit(
              { intent: "subscribe", plan: pendingPlan },
              { method: "post" },
            )
          }
        >
          Approve {PLAN_LABELS[pendingPlan]} in Shopify
        </s-button>
        {billingTestMode && (
          <s-text tone="neutral">
            Test billing mode is on for this store — charges appear as test
            subscriptions until you install on a live store.
          </s-text>
        )}
      </s-stack>
    </s-banner>
  );
}

export default function BillingPage() {
  const actionData = useActionData<typeof action>();
  const {
    billing,
    pendingPlan,
    activeSubscriptionNames,
    needsSubscriptionApproval,
    pendingShopifyPlan,
    billingTestMode,
    themeEditorUrl,
    activeSubscriptions,
    hasActiveShopifySubscription,
    billingError,
  } = useLoaderData<typeof loader>();
  const errorMessage = actionData?.error ?? billingError;

  return (
    <s-page heading="Billing & uninstall">
      <s-stack direction="block" gap="large">
        {errorMessage && (
          <s-banner tone="critical">{errorMessage}</s-banner>
        )}

        <s-box padding="large" borderWidth="base" borderRadius="base" background="subdued">
          <s-text tone="neutral">
            Choose the plan that fits your store. Upgrade or downgrade anytime
            from this page — paid plans are billed through Shopify on a 30-day
            cycle.
          </s-text>
        </s-box>

        {needsSubscriptionApproval && pendingPlan && pendingShopifyPlan && (
          <PendingApprovalBanner
            pendingPlan={pendingPlan}
            currentPlanLabel={billing.planLabel}
            billingTestMode={billingTestMode}
          />
        )}

        <s-section heading="Current plan">
          <s-stack direction="block" gap="large">
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
                label="Discount redemptions"
                value={String(billing.revenueGenerated)}
              />
            </div>

            {activeSubscriptionNames.length > 0 && (
              <s-box padding="large" borderWidth="base" borderRadius="base">
                <s-stack direction="block" gap="base">
                  <s-heading>Shopify subscription</s-heading>
                  {activeSubscriptions.map((subscription) => (
                    <s-text key={subscription.id}>
                      Active: {subscription.name}
                    </s-text>
                  ))}
                </s-stack>
              </s-box>
            )}
          </s-stack>
        </s-section>

        <s-section heading="Pricing plans">
          <s-stack direction="block" gap="large">
            <s-paragraph>
              Pick a plan below. You can change plans without reinstalling the
              app or contacting support.
            </s-paragraph>

            <div className={styles.gridCards}>
              {PLAN_ORDER.map((plan) => (
                <PlanCard
                  key={plan}
                  plan={plan}
                  currentPlan={billing.plan}
                  hasActiveSubscription={hasActiveShopifySubscription}
                />
              ))}
            </div>

            <s-box padding="large" borderWidth="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>How billing works</s-heading>
                <s-unordered-list>
                  <s-list-item>
                    Free includes unlimited offers, the theme widget, and
                    automatic Shopify discounts
                  </s-list-item>
                  <s-list-item>
                    Select a paid plan when you are ready — approve the charge in
                    Shopify
                  </s-list-item>
                  <s-list-item>
                    Switch plans or return to Free anytime from this page
                  </s-list-item>
                  <s-list-item>
                    Discount redemptions are counted from your synced Shopify
                    automatic discounts
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
