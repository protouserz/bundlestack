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
import { AppLoadingIndicator } from "../components/AppLoadingIndicator";
import { AppSupportFooter } from "../components/AppSupportFooter";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

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
  };
};

// Partners embedded-app scanner looks for this meta tag in the initial HTML.
export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.apiKey) return [];
  return [{ name: "shopify-api-key", content: data.apiKey }];
};

export default function App() {
  const { apiKey, privacyUrl } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <NavMenu>
        {/* rel="home" marks the landing route (BFS 4.1.4) */}
        <Link to="/app" rel="home">
          Dashboard
        </Link>
        <Link to="/app/offers">Offers</Link>
        <Link to="/app/billing">Billing</Link>
        <Link to="/app/support">Support</Link>
      </NavMenu>
      <AppLoadingIndicator />
      <Outlet />
      <AppSupportFooter privacyUrl={privacyUrl} />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
