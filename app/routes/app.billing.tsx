import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Link,
  redirect,
  useFetcher,
  useLoaderData,
  useNavigation,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { StatCard } from "../components/StatCard";
import { SButton, SPage } from "../components/polaris";
import styles from "../components/ui.module.css";
import {
  billingReturnUrl,
  buildExitIframePath,
  createBillingConfirmationUrl,
  formatBillingError,
  getShopifyAppPricingUrl,
  isManagedPricingBillingError,
  usesShopifyAppPricingSubscriptions,
  resolveBillingTestMode,
} from "../billing-session.server";
import { openBillingHandoff } from "../billing-client";
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
  resolveCurrentBillingPlan,
  resolvePendingBillingPlan,
  setPendingBillingPlan,
  setShopBillingPlan,
} from "../models/bundle.server";

type BillingContext = Awaited<ReturnType<typeof authenticate.admin>>;

async function requestPaidPlan(
  { admin, session }: BillingContext,
  request: Request,
  plan: Exclude<BillingPlan, "free">,
) {
  const shopifyPlan = getShopifyPlanForTier(plan);
  if (!shopifyPlan) {
    throw new Error("Invalid billing plan selected.");
  }

  const isTest = await resolveBillingTestMode(admin);
  const returnUrl = billingReturnUrl(request);
  const confirmationUrl = await createBillingConfirmationUrl(
    admin,
    shopifyPlan,
    returnUrl,
    isTest,
  );

  await setPendingBillingPlan(session.shop, plan);

  return {
    exitIframePath: buildExitIframePath(request, session.shop, confirmationUrl),
  };
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

  const planHandle = requestUrl.searchParams.get("plan_handle");
  const chargeId = requestUrl.searchParams.get("charge_id");
  const storedPlan = isBillingPlan(settings.billingPlan)
    ? settings.billingPlan
    : "free";

  const currentPlan = resolveCurrentBillingPlan({
    activeSubscriptionNames,
    planHandle,
    chargeId,
    storedPlan,
  });
  const pendingPlan = resolvePendingBillingPlan(settings.pendingBillingPlan);

  if (currentPlan !== settings.billingPlan) {
    await setShopBillingPlan(session.shop, currentPlan);
  }

  if (chargeId || (activeSubscriptionNames.length > 0 && settings.pendingBillingPlan)) {
    await clearPendingBillingPlan(session.shop);
  }

  const billingSummary = getBillingSummary(
    currentPlan,
    stats.totalDiscountUses,
  );
  const shopHandle = session.shop.replace(".myshopify.com", "");
  const pendingShopifyPlan = pendingPlan ? getShopifyPlanForTier(pendingPlan) : null;
  const hasActiveShopifySubscription = activeSubscriptions.length > 0;
  const needsSubscriptionApproval =
    pendingPlan !== null &&
    pendingShopifyPlan !== null &&
    !activeSubscriptionNames.includes(pendingShopifyPlan);
  const billingError = requestUrl.searchParams.get("billing_error");
  const usesShopifyAppPricing =
    usesShopifyAppPricingSubscriptions(activeSubscriptionNames);
  const shopifyPricingUrl = getShopifyAppPricingUrl(session.shop);

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
    usesShopifyAppPricing,
    shopifyPricingUrl,
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

  const page = await loadBillingPage(request, billingContext);

  if (
    requestUrl.searchParams.has("plan_handle") ||
    requestUrl.searchParams.has("charge_id")
  ) {
    const params = new URLSearchParams(requestUrl.searchParams);
    params.delete("plan_handle");
    params.delete("charge_id");
    const query = params.toString();
    throw redirect(query ? `/app/billing?${query}` : "/app/billing");
  }

  return page;
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
  const { billing, session, admin, redirect: shopifyRedirect } = billingContext;
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const isTest = await resolveBillingTestMode(admin);

  const redirectToShopifyPricing = () => {
    throw shopifyRedirect(getShopifyAppPricingUrl(session.shop), {
      target: "_top",
    });
  };

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

    const billingCheck = await billing.check();
    const activeSubscriptionNames = billingCheck.appSubscriptions
      .filter((subscription) => subscription.status === "ACTIVE")
      .map((subscription) => subscription.name);

    if (usesShopifyAppPricingSubscriptions(activeSubscriptionNames)) {
      redirectToShopifyPricing();
    }

    try {
      return await requestPaidPlan(billingContext, request, plan);
    } catch (error) {
      if (isManagedPricingBillingError(error)) {
        redirectToShopifyPricing();
      }
      return { error: formatBillingError(error) };
    }
  }

  const legacyPlan = formData.get("plan");
  const allowedPlans = new Set<string>(Object.values(SHOPIFY_BILLING_PLANS));
  if (typeof legacyPlan === "string" && allowedPlans.has(legacyPlan)) {
    const tier = getTierForShopifyPlan(legacyPlan);
    if (tier) {
      try {
        return await requestPaidPlan(billingContext, request, tier);
      } catch (error) {
        if (isManagedPricingBillingError(error)) {
          redirectToShopifyPricing();
        }
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
  usesShopifyAppPricing,
  subscribeFetcher,
}: {
  plan: BillingPlan;
  currentPlan: BillingPlan;
  hasActiveSubscription: boolean;
  usesShopifyAppPricing: boolean;
  subscribeFetcher: ReturnType<typeof useFetcher<typeof action>>;
}) {
  const navigation = useNavigation();
  const features = PLAN_FEATURES[plan];
  const isCurrent =
    plan === currentPlan &&
    (plan === "free" || hasActiveSubscription);
  const planIndex = PLAN_ORDER.indexOf(plan);
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  const isUpgrade = planIndex > currentIndex;
  const isBusy =
    navigation.state !== "idle" || subscribeFetcher.state !== "idle";

  const buttonLabel =
    plan === "free"
      ? "Switch to Free"
      : usesShopifyAppPricing
        ? `Change to ${PLAN_LABELS[plan]} in Shopify`
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
          <subscribeFetcher.Form method="post">
            <input type="hidden" name="intent" value="subscribe" />
            <input type="hidden" name="plan" value="free" />
            <SButton
              type="submit"
              variant="tertiary"
              {...(isBusy ? { loading: true } : {})}
            >
              {buttonLabel}
            </SButton>
          </subscribeFetcher.Form>
        )}

        {!isCurrent && plan !== "free" && (
          <subscribeFetcher.Form method="post">
            <input type="hidden" name="intent" value="subscribe" />
            <input type="hidden" name="plan" value={plan} />
            <SButton
              type="submit"
              variant={isUpgrade ? "primary" : "tertiary"}
              {...(isBusy ? { loading: true } : {})}
            >
              {buttonLabel}
            </SButton>
          </subscribeFetcher.Form>
        )}

        {isCurrent && plan !== "free" && hasActiveSubscription && (
          <subscribeFetcher.Form method="post">
            <input type="hidden" name="intent" value="cancel" />
            <SButton
              type="submit"
              variant="tertiary"
              {...(isBusy ? { loading: true } : {})}
            >
              Cancel paid subscription
            </SButton>
          </subscribeFetcher.Form>
        )}
      </s-stack>
    </s-box>
  );
}

function PendingApprovalBanner({
  pendingPlan,
  currentPlanLabel,
  billingTestMode,
  subscribeFetcher,
}: {
  pendingPlan: BillingPlan;
  currentPlanLabel: string;
  billingTestMode: boolean;
  subscribeFetcher: ReturnType<typeof useFetcher<typeof action>>;
}) {
  return (
    <s-banner tone="warning">
      <s-stack direction="block" gap="base">
        <s-text>
          Approve the {PLAN_LABELS[pendingPlan]} plan (
          {formatPlanPrice(pendingPlan)}/mo) in Shopify to activate billing. Your
          current plan stays {currentPlanLabel} until approval is complete.
        </s-text>
        <subscribeFetcher.Form method="post">
          <input type="hidden" name="intent" value="subscribe" />
          <input type="hidden" name="plan" value={pendingPlan} />
          <SButton type="submit" variant="primary">
            Approve {PLAN_LABELS[pendingPlan]} in Shopify
          </SButton>
        </subscribeFetcher.Form>
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
  const subscribeFetcher = useFetcher<typeof action>();
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
    usesShopifyAppPricing,
  } = useLoaderData<typeof loader>();
  const fetcherData = subscribeFetcher.data;
  const errorMessage =
    (fetcherData && "error" in fetcherData ? fetcherData.error : undefined) ??
    billingError;

  useEffect(() => {
    if (!fetcherData || !("exitIframePath" in fetcherData)) return;
    if (!fetcherData.exitIframePath) return;
    openBillingHandoff(fetcherData.exitIframePath);
  }, [fetcherData]);

  return (
    <SPage heading="Billing & uninstall">
      <s-stack direction="block" gap="large">
        {errorMessage && (
          <s-banner tone="critical">{errorMessage}</s-banner>
        )}

        {usesShopifyAppPricing && (
          <s-banner tone="info">
            <s-text>
              Plan changes use Shopify&apos;s hosted plan page. Click a paid plan
              below to open it in Shopify admin, then approve the charge there.
            </s-text>
          </s-banner>
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
            subscribeFetcher={subscribeFetcher}
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
                value={String(billing.discountRedemptions)}
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
              Choose a plan below when you are ready. Paid plans are approved
              through Shopify — you can upgrade, downgrade, or return to Free
              anytime without reinstalling or contacting support.
            </s-paragraph>

            <div className={styles.gridCards}>
              {PLAN_ORDER.map((plan) => (
                <PlanCard
                  key={plan}
                  plan={plan}
                  currentPlan={billing.plan}
                  hasActiveSubscription={hasActiveShopifySubscription}
                  usesShopifyAppPricing={usesShopifyAppPricing}
                  subscribeFetcher={subscribeFetcher}
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
                    Shopify (plans are not upgraded automatically)
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
    </SPage>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
