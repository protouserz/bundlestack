import type {
  HeadersFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "react-router";
import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { isE2EAuthBypassEnabled } from "../e2e-auth.server";
import { AppLoadingIndicator } from "../components/AppLoadingIndicator";
import { AppSupportFooter } from "../components/AppSupportFooter";
import { E2EModeProvider } from "../components/E2EModeContext";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const appUrl = (process.env.SHOPIFY_APP_URL || "").replace(/\/$/, "");
  const e2eMode = isE2EAuthBypassEnabled();

  // eslint-disable-next-line no-undef
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    privacyUrl: appUrl ? `${appUrl}/privacy` : "/privacy",
    e2eMode,
  };
};

// Partners embedded-app scanner looks for this meta tag in the initial HTML.
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.apiKey) return [];
  return [{ name: "shopify-api-key", content: data.apiKey }];
};

function E2EShell({ privacyUrl }: { privacyUrl: string }) {
  return (
    <E2EModeProvider value>
      <div
        data-testid="e2e-shell"
        style={{ fontFamily: "system-ui, sans-serif" }}
      >
        <nav
          aria-label="E2E navigation"
          style={{
            display: "flex",
            gap: "1rem",
            padding: "1rem",
            borderBottom: "1px solid #e2e8f0",
            background: "#0f172a",
          }}
        >
          <Link to="/app" style={{ color: "#f8fafc" }}>
            Dashboard
          </Link>
          <Link to="/app/offers" style={{ color: "#f8fafc" }}>
            Offers
          </Link>
          <Link to="/app/coupons" style={{ color: "#f8fafc" }}>
            Coupons
          </Link>
          <Link to="/app/billing" style={{ color: "#f8fafc" }}>
            Billing
          </Link>
          <Link to="/app/support" style={{ color: "#f8fafc" }}>
            Support
          </Link>
        </nav>
        <main style={{ padding: "1rem" }}>
          <Outlet />
        </main>
        <AppSupportFooter privacyUrl={privacyUrl} />
      </div>
    </E2EModeProvider>
  );
}

export default function App() {
  const { apiKey, privacyUrl, e2eMode } = useLoaderData<typeof loader>();

  if (e2eMode) {
    return <E2EShell privacyUrl={privacyUrl} />;
  }

  return (
    <E2EModeProvider value={false}>
      <AppProvider embedded apiKey={apiKey}>
        <NavMenu>
          {/* rel="home" marks the landing route and keeps it out of the tab list */}
          <Link to="/app" rel="home">
            Dashboard
          </Link>
          <Link to="/app/offers">Offers</Link>
          <Link to="/app/coupons">Coupons</Link>
          <Link to="/app/billing">Billing</Link>
          <Link to="/app/support">Support</Link>
        </NavMenu>
        <AppLoadingIndicator />
        <Outlet />
        <AppSupportFooter privacyUrl={privacyUrl} />
      </AppProvider>
    </E2EModeProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
