import type {
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { seedDefaultOfferIfNeeded } from "../models/onboarding.server";
import { AppLoadingIndicator } from "../components/AppLoadingIndicator";
import { AppSupportFooter } from "../components/AppSupportFooter";
import { SAppNav, SNavLink } from "../components/polaris";
import { I18nProvider, useI18n } from "../i18n/I18nProvider";
import { localeFromRequest } from "../i18n";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  await seedDefaultOfferIfNeeded(session.shop, admin);

  const apiKey = process.env.SHOPIFY_API_KEY || "";
  if (process.env.NODE_ENV === "production" && !apiKey) {
    throw new Response(
      "SHOPIFY_API_KEY is required for the embedded admin app.",
      { status: 500 },
    );
  }

  const appUrl = (process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "");

  // eslint-disable-next-line no-undef
  return {
    apiKey,
    privacyUrl: appUrl ? `${appUrl}/privacy` : "/privacy",
    locale: localeFromRequest(request),
  };
};

// Partners embedded-app scanner looks for this meta tag in the initial HTML.
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.apiKey) return [];
  return [{ name: "shopify-api-key", content: data.apiKey }];
};

export default function App() {
  const { apiKey, privacyUrl, locale } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <I18nProvider locale={locale}>
        <AppChrome privacyUrl={privacyUrl} />
      </I18nProvider>
    </AppProvider>
  );
}

function AppChrome({ privacyUrl }: { privacyUrl: string }) {
  const { t } = useI18n();

  return (
    <>
      {/* Host admin sidebar. App Bridge reads NavMenu on embed; s-app-nav
          satisfies Built for Shopify 4.1.4. */}
      <NavMenu>
        <a href="/app" rel="home">
          {t("nav.dashboard")}
        </a>
        <a href="/app/offers">{t("nav.offers")}</a>
        <a href="/app/promotions">{t("nav.promotions")}</a>
        <a href="/app/coupons">{t("nav.coupons")}</a>
        <a href="/app/billing">{t("nav.billing")}</a>
        <a href="/app/support">{t("nav.support")}</a>
      </NavMenu>
      <SAppNav>
        <SNavLink href="/app" rel="home">
          {t("nav.dashboard")}
        </SNavLink>
        <SNavLink href="/app/offers">{t("nav.offers")}</SNavLink>
        <SNavLink href="/app/promotions">{t("nav.promotions")}</SNavLink>
        <SNavLink href="/app/coupons">{t("nav.coupons")}</SNavLink>
        <SNavLink href="/app/billing">{t("nav.billing")}</SNavLink>
        <SNavLink href="/app/support">{t("nav.support")}</SNavLink>
      </SAppNav>
      <AppLoadingIndicator />
      <Outlet />
      <AppSupportFooter privacyUrl={privacyUrl} />
    </>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
